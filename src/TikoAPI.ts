import {PlatformConfig} from 'homebridge';
import {authenticationQuery} from './queries/authenticationQuery';
import {getPropertyQuery} from './queries/getPropertyQuery';
import {getRoomQuery} from './queries/getRoomQuery';
import {TikoLoginResponse, TikoMode, TikoPropertyResponse, TikoRoom, TikoRoomResponse} from './types';
import {ApolloClient, ApolloLink, createHttpLink, InMemoryCache, NormalizedCacheObject} from '@apollo/client/core';
import {setTemperatureQuery} from './queries/setTemperatureQuery';
import {setRoomModeQuery} from './queries/setRoomMode';

export default class TikoAPI {
  private propertyId: number | null = null;

  constructor(
    private config: PlatformConfig,
    private client: ApolloClient<NormalizedCacheObject>,
  ) {
  }

  public async authenticate() {
    const {login, password} = this.config;

    const {data} = await this.client.mutate({
      mutation: authenticationQuery,
      variables: {
        email: login,
        password: password,
        langCode: 'fr',
        retainSession: true,
      },
    }) as TikoLoginResponse;

    const userToken = data.logIn.token;

    const authLink = TikoAPI._createApolloLink(this.config, userToken);
    this.client.setLink(authLink);

    const defaultPropertyId = data.logIn.user.properties[0].id;
    this.setPropertyId(this.config.propertyId || defaultPropertyId);
  }

  public setPropertyId(value: number | null) {
    this.propertyId = value;
  }

  public async getAllRooms(): Promise<TikoRoom[]> {
    const propertyResponse = await this.client.query({
      query: getPropertyQuery,
      variables: {id: this.propertyId},
    }) as TikoPropertyResponse;
    return propertyResponse.data.property.rooms;
  }

  public async getRoom(roomId: number): Promise<TikoRoom> {
    const roomResponse = await this.client.query({
      query: getRoomQuery,
      variables: {propertyId: this.propertyId, roomId: roomId},
      fetchPolicy: 'no-cache',
    }) as TikoRoomResponse;
    return roomResponse.data.property.room;
  }

  public async setTargetTemperature(roomId: number, targetTemperature: number) {
    await this.client.mutate({
      mutation: setTemperatureQuery,
      variables: {
        propertyId: this.propertyId,
        roomId: roomId,
        temperature: targetTemperature,
      },
    });
  }

  public async setRoomMode(roomId: number, mode: TikoMode) {
    await this.client.mutate({
      mutation: setRoomModeQuery,
      variables: {
        propertyId: this.propertyId,
        roomId,
        mode: mode !== null ? mode :false,
      },
    });
  }

  static build(config: PlatformConfig): TikoAPI {
    const client = new ApolloClient({
      link: TikoAPI._createApolloLink(config),
      cache: new InMemoryCache(),
    });

    return new TikoAPI(config, client);
  }

  private static _createApolloLink(config: PlatformConfig, userToken: string | null = null): ApolloLink {
    const requestUrl = `${config.endpoint}/api/v3/graphql/`;
    const httpLink = createHttpLink({uri: requestUrl});

    if (!userToken) {
      return httpLink;
    }

    const authLink = new ApolloLink((operation, forward) => {
      operation.setContext(({headers}) => ({
        headers: {
          ...headers,
          authorization: `token ${userToken}`,
        },
      }));
      return forward(operation);
    });

    return authLink.concat(httpLink);
  }
}
