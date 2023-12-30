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
      .onGet(this.getCurrentHeatingCoolingState.bind(this));

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
    const heatingOperating = await this._getStatusFor('heatingOperating');
    return heatingOperating ?
      this.platform.Characteristic.CurrentHeatingCoolingState.HEAT :
      this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
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

  private async _getStatusFor(key: string) {
    const {id, name} = this.accessory.context.room;

    const room = await this.platform.tiko.getRoom(id);

    const value = room.status[key];

    this.platform.log.debug(`GET status "${key}" for room "${name}": ${value}`);

    if (value === null) {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    return value;
  }
}
