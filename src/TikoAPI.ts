import {PlatformConfig} from 'homebridge';
import {authenticationQuery} from './queries/authenticationQuery';
import {getPropertyQuery} from './queries/getPropertyQuery';
import {getRoomQuery} from './queries/getRoomQuery';
import {TikoLoginResponse, TikoMode, TikoPropertyResponse, TikoRoom, TikoRoomResponse} from './types';
import {ApolloClient, ApolloError, ApolloLink, createHttpLink, InMemoryCache, NormalizedCacheObject} from '@apollo/client/core';
import {setTemperatureQuery} from './queries/setTemperatureQuery';
import {setRoomModeQuery} from './queries/setRoomMode';
import {TikoApiError} from './TikoApiError';

export default class TikoAPI {
  private propertyId: number | null = null;

  constructor(
    private config: PlatformConfig,
    private client: ApolloClient<NormalizedCacheObject>,
  ) {
    client.setLink(TikoAPI._createApolloLink(config));
  }

  public async authenticate() {
    const {login, password} = this.config;

    try {
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
    } catch (error) {
      if (error instanceof ApolloError) {
        throw new TikoApiError(error.message);
      }

      throw error;
    }
  }

  public setPropertyId(value: number | null) {
    this.propertyId = value;
  }

  public async getAllRooms(): Promise<TikoRoom[]> {
    try {
      const propertyResponse = await this.client.query({
        query: getPropertyQuery,
        variables: {id: this.propertyId},
      }) as TikoPropertyResponse;
      return propertyResponse.data.property.rooms;
    } catch (error) {
      if (error instanceof ApolloError) {
        throw new TikoApiError(error.message);
      }

      throw error;
    }
  }

  public async getRoom(roomId: number): Promise<TikoRoom> {
    try {
      const roomResponse = await this.client.query({
        query: getRoomQuery,
        variables: {propertyId: this.propertyId, roomId: roomId},
        fetchPolicy: 'no-cache',
      }) as TikoRoomResponse;
      return roomResponse.data.property.room;
    } catch (error) {
      if (error instanceof ApolloError) {
        throw new TikoApiError(error.message);
      }

      throw error;
    }
  }

  public async setTargetTemperature(roomId: number, targetTemperature: number) {
    try {
      await this.client.mutate({
        mutation: setTemperatureQuery,
        variables: {
          propertyId: this.propertyId,
          roomId: roomId,
          temperature: targetTemperature,
        },
      });
    } catch (error) {
      if (error instanceof ApolloError) {
        throw new TikoApiError(error.message);
      }

      throw error;
    }
  }

  public async setRoomMode(roomId: number, mode: TikoMode) {
    try {
      await this.client.mutate({
        mutation: setRoomModeQuery,
        variables: {
          propertyId: this.propertyId,
          roomId,
          mode: mode !== null ? mode : false,
        },
      });
    } catch (error) {
      if (error instanceof ApolloError) {
        throw new TikoApiError(error.message);
      }

      throw error;
    }
  }

  static build(config: PlatformConfig): TikoAPI {
    const client = new ApolloClient({
      cache: new InMemoryCache(),
    });

    return new TikoAPI(config, client);
  }

  private static _createApolloLink(config: PlatformConfig, userToken: string | null = null): ApolloLink {
    const requestUrl = config.endpoint ?? 'https://particuliers-tiko.fr/api/v3/graphql/';
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
