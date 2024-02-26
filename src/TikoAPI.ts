import {PlatformConfig} from 'homebridge';
import * as setCookieParser from 'set-cookie-parser';

import {authenticationQuery} from './queries/authenticationQuery';
import {getPropertyQuery} from './queries/getPropertyQuery';
import {getRoomQuery} from './queries/getRoomQuery';
import {TikoLoginResponse, TikoMode, TikoPropertyResponse, TikoRoom, TikoRoomResponse} from './types';
import {
  ApolloClient,
  ApolloError,
  ApolloLink,
  createHttpLink,
  DocumentNode,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client/core';
import {setTemperatureQuery} from './queries/setTemperatureQuery';
import {setRoomModeQuery} from './queries/setRoomMode';
import {TikoApiError} from './TikoApiError';
import {awaitUntilTimeout} from './timeout/awaitUntilTimeout';
import {TimeoutError} from './timeout/TimeoutError';

type Cookie = {
  name: string;
  value: string;
};

export default class TikoAPI {
  private propertyId: number | null = null;
  private cookies: Cookie[] = [];

  constructor(
    private config: PlatformConfig,
    private client: ApolloClient<NormalizedCacheObject>,
  ) {
    client.setLink(this._createApolloLink(config));
  }

  public async authenticate() {
    const {login, password} = this.config;

    const {data} = await this._callTikoApi('mutate', authenticationQuery, {
      email: login,
      password: password,
      langCode: 'fr',
      retainSession: true,
    }) as TikoLoginResponse;

    const userToken = data.logIn.token;

    const authLink = this._createApolloLink(this.config, userToken);
    this.client.setLink(authLink);

    const defaultPropertyId = data.logIn.user.properties[0].id;
    this.setPropertyId(this.config.propertyId || defaultPropertyId);
  }

  public setPropertyId(value: number | null) {
    this.propertyId = value;
  }

  public async getAllRooms(): Promise<TikoRoom[]> {
    const propertyResponse = await this._callTikoApi('query', getPropertyQuery,
      {id: this.propertyId},
    ) as TikoPropertyResponse;
    return propertyResponse.data.property.rooms;
  }

  public async getRoom(roomId: number): Promise<TikoRoom> {
    const roomResponse = await this._callTikoApi(
      'query',
      getRoomQuery,
      {propertyId: this.propertyId, roomId: roomId},
      'no-cache',
    ) as TikoRoomResponse;
    return roomResponse.data.property.room;
  }

  public async setTargetTemperature(roomId: number, targetTemperature: number) {
    await this._callTikoApi('mutate', setTemperatureQuery, {
      propertyId: this.propertyId,
      roomId: roomId,
      temperature: targetTemperature,
    });
  }

  public async setRoomMode(roomId: number, mode: TikoMode) {
    const tikoMode = mode !== null ? mode : false;
    await this._callTikoApi('mutate', setRoomModeQuery, {
      propertyId: this.propertyId,
      roomId,
      mode: tikoMode,
    });
  }

  private async _callTikoApi(
    actionName: 'query' | 'mutate',
    query: DocumentNode,
    variables: object,
    fetchPolicy: 'no-cache' | undefined = undefined,
  ) {
    try {
      if (actionName === 'query') {
        return await awaitUntilTimeout(
          this.client.query({query: query, variables: variables, fetchPolicy}),
          this.config.timeout || 1000,
        );
      }
      if (actionName === 'mutate') {
        return await this.client.mutate({mutation: query, variables: variables});
      }
    } catch (error) {
      if (error instanceof TimeoutError || error instanceof ApolloError) {
        throw new TikoApiError(error.message);
      }

      throw error;
    }
  }

  private _createApolloLink(config: PlatformConfig, userToken: string | null = null): ApolloLink {
    const requestUrl = config.endpoint ?? 'https://particuliers-tiko.fr/api/v3/graphql/';
    const httpLink = createHttpLink({uri: requestUrl});

    const cookiesLink = new ApolloLink((operation, forward) => {
      return forward(operation).map((response) => {
        const context = operation.getContext();
        const setCookieHeader = context.response.headers.get('set-cookie');
        if (setCookieHeader) {
          const cookieStrings = setCookieParser.splitCookiesString(setCookieHeader);
          this.cookies = cookieStrings.map((cookieString) => setCookieParser.parseString(cookieString));
        }
        return response;
      });
    });

    const httpLinkWithCookies = cookiesLink.concat(httpLink);

    if (!userToken) {
      return httpLinkWithCookies;
    }

    const authLink = new ApolloLink((operation, forward) => {
      operation.setContext(({headers}) => {
        return ({
          headers: {
            ...headers,
            authorization: `token ${userToken}`,
            cookie: this.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; '),
          },
        });
      });
      return forward(operation);
    });

    return authLink.concat(httpLinkWithCookies);
  }

  static build(config: PlatformConfig): TikoAPI {
    const client = this._createApolloClient();
    return new TikoAPI(config, client);
  }

  protected static _createApolloClient() {
    return new ApolloClient({
      cache: new InMemoryCache(),
    });
  }
}
