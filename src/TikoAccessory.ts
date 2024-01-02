import {CharacteristicValue, PlatformAccessory, Service} from 'homebridge';

import {TikoPlatform} from './TikoPlatform';
import {TikoMode} from './types';

export class TikoAccessory {
  private service: Service;

  constructor(
    private readonly platform: TikoPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    const service = this.accessory.getService(this.platform.Service.AccessoryInformation)!;
    service.setCharacteristic(this.platform.Characteristic.Manufacturer, 'Tiko');
    service.setCharacteristic(this.platform.Characteristic.Model, 'Tiko');
    service.setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.room.id.toString());

    this.service = this.accessory.getService(this.platform.Service.Thermostat) ||
      this.accessory.addService(this.platform.Service.Thermostat);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.room.name);
    this.service.setCharacteristic(
      this.platform.Characteristic.TemperatureDisplayUnits,
      this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS,
    );

    this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .onGet(this.getTargetTemperature.bind(this));
    this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .onSet(this.setTargetTemperature.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onGet(this.getTargetHeatingCoolingState.bind(this));
    this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onSet(this.setTargetHeatingCoolingState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
      .onGet(this.getCurrentHeatingCoolingState.bind(this));
  }

  async getTargetTemperature(): Promise<CharacteristicValue> {
    const value = await this._getValueFor('targetTemperatureDegrees');
    return value >= 10 ? value : 10;
  }

  async setTargetTemperature(value: CharacteristicValue): Promise<void> {
    const {id, name} = this.accessory.context.room;
    const targetTemperature = Number(value);
    this.platform.log.debug(`SET target temperature for room "${name}" to ${value}`);
    await this.platform.tiko.setTargetTemperature(id, targetTemperature);
  }

  async getCurrentTemperature(): Promise<CharacteristicValue> {
    return await this._getValueFor('currentTemperatureDegrees');
  }

  async getCurrentHeatingCoolingState(): Promise<CharacteristicValue> {
    const targetHeatingCoolingState = await this.getTargetHeatingCoolingState();
    return targetHeatingCoolingState === this.platform.Characteristic.TargetHeatingCoolingState.AUTO
      ? this.platform.Characteristic.TargetHeatingCoolingState.HEAT
      : targetHeatingCoolingState;
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

  async setTargetHeatingCoolingState(value: CharacteristicValue) {
    const {id, name} = this.accessory.context.room;

    let mode: TikoMode = null;
    if (value === this.platform.Characteristic.TargetHeatingCoolingState.OFF) {
      mode = 'frost';
    }

    this.platform.log.debug(`SET mode for room "${name}" to ${value} as ${mode}`);

    await this.platform.tiko.setRoomMode(id, mode);
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

  private _getCurrentMode(modes: { boost: boolean; absence: boolean; frost: boolean; disableHeating: boolean }): TikoMode {
    for (const mode in modes) {
      if (modes[mode] === true) {
        return mode as TikoMode;
      }
    }

    return null;
  }
}
