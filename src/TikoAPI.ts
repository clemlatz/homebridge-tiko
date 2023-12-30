import {Logger, PlatformConfig} from 'homebridge';
import {request, Variables} from 'graphql-request';
import {authenticationQuery} from './queries/authenticationQuery';
import {getPropertyQuery} from './queries/getPropertyQuery';
import {getRoomQuery} from './queries/getRoomQuery';
import {TikoLoginResponse, TikoProperty, TikoPropertyResponse, TikoResponse, TikoRoom, TikoRoomResponse} from './types';

export default class TikoAPI {
  private propertyId: number | null = null;
  private userToken: string | null = null;

  constructor(
    private config: PlatformConfig,
    private log: Logger,
  ) {
  }

  public async authenticate() {
    const {login, password} = this.config;

    if (!login || !password) {
      this.log.error('TikoAPI configuration not found.');
      return;
    }

    const loginResponse = await this._queryAPI(authenticationQuery, {
      email: login,
      password: password,
      langCode: 'fr',
      retainSession: true,
    }) as TikoLoginResponse;

    this.userToken = loginResponse.logIn.token;

    const defaultPropertyId = loginResponse.logIn.user.properties[0].id;
    this.propertyId = this.config.propertyId || defaultPropertyId;

    this.log.debug(`Successfully logged in with account ${login}.`);
  }

  public async getProperty(): Promise<TikoProperty> {
    if (!this.userToken || !this.propertyId) {
      throw new Error('TikoAPI is not authenticated');
    }

    const propertyResponse = await this._queryAPIWithAuthentication(
      getPropertyQuery,
      {id: this.propertyId},
    ) as TikoPropertyResponse;
    return propertyResponse.property;
  }

  public async getRoom(roomId: number): Promise<TikoRoom> {
    if (!this.userToken || !this.propertyId) {
      throw new Error('TikoAPI is not authenticated');
    }

    const roomResponse = await this._queryAPIWithAuthentication(
      getRoomQuery,
      {propertyId: this.propertyId, roomId: roomId},
    ) as TikoRoomResponse;
    return roomResponse.property.room;
  }

  private async _queryAPI(query: string, variables: Variables, headers: Headers|null = null): Promise<TikoResponse> {
    headers = headers || new Headers();

    const requestUrl = `${this.config.endpoint}/api/v3/graphql/`;
    this.log.debug(`Querying ${requestUrl}…`);
    return await request(requestUrl, query, variables, headers) as TikoResponse;
  }

  private async _queryAPIWithAuthentication(query: string, variables: Variables): Promise<TikoResponse> {
    const headers = new Headers();
    headers.append('Authorization', `token ${this.userToken}`);

    return this._queryAPI(query, variables, headers);
  }
}
