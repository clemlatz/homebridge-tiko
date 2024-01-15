import {API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic, UnknownContext} from 'homebridge';

import {PLATFORM_NAME, PLUGIN_NAME} from './settings';
import {TikoAccessory} from './TikoAccessory';
import {TikoRoom} from './types';
import {TikoApiError} from './TikoApiError';
import TikoApiWithThrottle from './TikoApiWithThrottle';

export class TikoPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly accessories: PlatformAccessory[] = [];
  public readonly tiko: TikoApiWithThrottle;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.tiko = TikoApiWithThrottle.build(config);

    if (!this.config.name) {
      this.log.error('Missing required parameter "name" in config');
      return;
    }

    if (!this.config.login) {
      this.log.error('Missing required parameter "login" in config');
      return;
    }

    if (!this.config.password) {
      this.log.error('Missing required parameter "password" in config');
      return;
    }

    this.log.debug('Finished initializing platform:', this.config.name);

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
    try {
      await this.tiko.authenticate();
      this.log.debug(`Successfully logged in with account ${this.config.login}.`);
    } catch(error) {
      if (error instanceof TikoApiError) {
        this.log.error(`An error occured while trying to login: ${error.message}`);
        return;
      }
    }

    const rooms = await this.tiko.getAllRooms();

    this._removeRoomNotExisting(rooms);

    for (const room of rooms) {
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

  private _removeRoomNotExisting(rooms: TikoRoom[]) {
    for (const accessory of this.accessories) {
      const room = rooms.find(room => room.id === accessory.context.room?.id);
      if (!room) {
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.log.info('Removing accessory not matching a room from cache:', accessory.displayName);
      }
    }
  }
}
