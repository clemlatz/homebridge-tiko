import TikoAPI from './TikoAPI';
import {TikoRoom} from './types';
import {PlatformConfig} from 'homebridge';

type RoomRequest = {
  promise: Promise<TikoRoom>;
  roomId: number;
};

export default class TikoApiWithThrottle extends TikoAPI {
  private currentRequests: RoomRequest[] = [];

  async getRoom(roomId: number): Promise<TikoRoom> {
    const currentRequestForRoom = this.currentRequests.find(request => request.roomId === roomId);
    if (currentRequestForRoom) {
      return currentRequestForRoom.promise;
    }

    const roomPromise = super.getRoom(roomId);
    this.currentRequests.push({ promise: roomPromise, roomId });

    const room = await roomPromise;
    this.currentRequests = this.currentRequests.filter(request => request.roomId === room.id);

    return room;
  }

  static build(config: PlatformConfig): TikoApiWithThrottle {
    const client = this._createApolloClient();
    return new TikoApiWithThrottle(config, client);
  }
}
