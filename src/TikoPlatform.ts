import {API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic, UnknownContext} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { TikoAccessory } from './TikoAccessory';
import TikoAPI from './TikoAPI';
import {TikoProperty, TikoRoom} from './types';

export class TikoPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly accessories: PlatformAccessory[] = [];
  public readonly tiko: TikoAPI;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    this.tiko = new TikoAPI(config, log);

    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');
      await this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  async discoverDevices() {
    await this.tiko.authenticate();
    const property = await this.tiko.getProperty();

    this._removeRoomNotExisting(property);

    for (const room of property.rooms) {
      const uuid = this.api.hap.uuid.generate(room.id.toString());
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        this._updateExistingRoom(existingAccessory, room);
      } else {
        this._createNewRoom(room, uuid);
      }
    }
  }

  private _createNewRoom(room: TikoRoom, uuid: string) {
    this.log.info('Adding new accessory:', room.name);
    const accessory = new this.api.platformAccessory(room.name, uuid);
    accessory.context.room = room;
    new TikoAccessory(this, accessory);
    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
  }

  private _updateExistingRoom(existingAccessory: PlatformAccessory<UnknownContext>, room: TikoRoom) {
    this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
    existingAccessory.context.room = room;
    new TikoAccessory(this, existingAccessory);
  }

  private _removeRoomNotExisting(property: TikoProperty) {
    for (const accessory of this.accessories) {
      const room = property.rooms.find(room => room.id === accessory.context.room?.id);
      if (!room) {
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.log.info('Removing accessory not matching a room from cache:', accessory.displayName);
      }
    }
  }
}
