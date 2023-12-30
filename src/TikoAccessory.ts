import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { TikoPlatform } from './TikoPlatform';

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

    this.service = this.accessory.getService(this.platform.Service.TemperatureSensor) ||
      this.accessory.addService(this.platform.Service.TemperatureSensor);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.room.name);

    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getTemperature.bind(this));
  }

  async getTemperature(): Promise<CharacteristicValue> {
    const { id, name } = this.accessory.context.room;
    const room = await this.platform.tiko.getRoom(id);

    const currentTemperatureDegrees = room.currentTemperatureDegrees;

    this.platform.log.debug(`Setting current temperature to ${currentTemperatureDegrees} for room ${name}`);

    if (currentTemperatureDegrees === null) {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    return currentTemperatureDegrees;
  }
}
