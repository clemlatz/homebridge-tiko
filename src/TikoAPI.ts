import {Logger, PlatformConfig} from 'homebridge';
import {authenticationQuery} from './queries/authenticationQuery';
import {getPropertyQuery} from './queries/getPropertyQuery';
import {getRoomQuery} from './queries/getRoomQuery';
import {TikoLoginResponse, TikoProperty, TikoPropertyResponse, TikoRoom, TikoRoomResponse} from './types';
import {ApolloClient, createHttpLink, InMemoryCache, NormalizedCacheObject} from '@apollo/client/core';
import {setContext} from '@apollo/client/link/context';

export default class TikoAPI {
  private propertyId: number | null = null;
  private userToken: string | null = null;
  private client: ApolloClient<NormalizedCacheObject>;

  constructor(
    private config: PlatformConfig,
    private log: Logger,
  ) {
    this.client = this._createGraphQLClient();
  }

  public async authenticate() {
    const {login, password} = this.config;

    if (!login || !password) {
      this.log.error('TikoAPI configuration not found.');
      return;
    }

    const {data} = await this.client.mutate({
      mutation: authenticationQuery,
      variables: {
        email: login,
        password: password,
        langCode: 'fr',
        retainSession: true,
      },
    }) as TikoLoginResponse;

    this.userToken = data.logIn.token;

    const defaultPropertyId = data.logIn.user.properties[0].id;
    this.propertyId = this.config.propertyId || defaultPropertyId;

    this.log.debug(`Successfully logged in with account ${login}.`);
  }

  public async getProperty(): Promise<TikoProperty> {
    if (!this.userToken || !this.propertyId) {
      throw new Error('TikoAPI is not authenticated');
    }

    const propertyResponse = await this.client.query({
      query: getPropertyQuery,
      variables: {id: this.propertyId},
    }) as TikoPropertyResponse;
    return propertyResponse.data.property;
  }

  public async getRoom(roomId: number): Promise<TikoRoom> {
    if (!this.userToken || !this.propertyId) {
      throw new Error('TikoAPI is not authenticated');
    }

    const roomResponse = await this.client.query({
      query: getRoomQuery,
      variables: {propertyId: this.propertyId, roomId: roomId},
    }) as TikoRoomResponse;
    return roomResponse.data.property.room;
  }

  private _createGraphQLClient() {
    const requestUrl = `${this.config.endpoint}/api/v3/graphql/`;
    const httpLink = createHttpLink({
      uri: requestUrl,
    });

    const authLink = setContext((_, {headers}) => {
      return {
        headers: {
          ...headers,
          authorization: this.userToken ? `token ${this.userToken}` : '',
        },
      };
    });

    return new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache(),
    });
  }
}
