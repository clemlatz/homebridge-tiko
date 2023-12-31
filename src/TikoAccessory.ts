import {CharacteristicValue, PlatformAccessory, Service} from 'homebridge';

import {TikoPlatform} from './TikoPlatform';

export class TikoAccessory {
  private service: Service;

  constructor(
    private readonly platform: TikoPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    this.service = this.accessory.getService(this.platform.Service.Thermostat) ||
      this.accessory.addService(this.platform.Service.Thermostat);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.room.name);
    this.service.setCharacteristic(
      this.platform.Characteristic.TemperatureDisplayUnits,
      this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS,
    );

    this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .onGet(this.getTargetTemperature.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onGet(this.getTargetHeatingCoolingState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
      .onGet(this.getCurrentHeatingCoolingState.bind(this));
  }

  async getTargetTemperature(): Promise<CharacteristicValue> {
    const value = await this._getValueFor('targetTemperatureDegrees');
    return value >= 10 ? value : 10;
  }

  async getCurrentTemperature(): Promise<CharacteristicValue> {
    return await this._getValueFor('currentTemperatureDegrees');
  }

  async getCurrentHeatingCoolingState(): Promise<CharacteristicValue> {
    const targetHeatingCoolingState = await this.getTargetHeatingCoolingState();
    return targetHeatingCoolingState < 3 ? targetHeatingCoolingState : 2;
  }

  async getTargetHeatingCoolingState(): Promise<CharacteristicValue> {
    const {id, name} = this.accessory.context.room;

    const room = await this.platform.tiko.getRoom(id);

    const modes = room.mode;

    const currentMode = this._getCurrentMode(modes);
    this.platform.log.debug(`GET mode for room "${name}": ${currentMode}`);

    if (currentMode === 'boost' || currentMode === 'absence') {
      return this.platform.Characteristic.TargetHeatingCoolingState.AUTO;
    }

    if (currentMode === 'frost' || currentMode === 'disableHeating') {
      return this.platform.Characteristic.TargetHeatingCoolingState.OFF;
    }

    return this.platform.Characteristic.TargetHeatingCoolingState.AUTO;
  }

  private async _getValueFor(key: string) {
    const {id, name} = this.accessory.context.room;

    const room = await this.platform.tiko.getRoom(id);

    const value = room[key];

    this.platform.log.debug(`GET "${key}" for room "${name}": ${value}`);

    if (value === null) {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    return value;
  }

  private _getCurrentMode(modes: { boost: boolean; absence: boolean; frost: boolean; disableHeating: boolean }): string|null {
    for (const mode in modes) {
      if (modes[mode] === true) {
        return mode;
      }
    }

    return null;
  }
}
