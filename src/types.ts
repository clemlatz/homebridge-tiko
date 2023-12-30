export type TikoResponse = TikoLoginResponse | TikoPropertyResponse | TikoRoomResponse;
export type TikoLoginResponse = {
  logIn: {
    token: string;
    user: {
      properties: [
        {
          id: number;
        }
      ];
    };
  };
};

export type TikoPropertyResponse = {
  property: TikoProperty;
};

export type TikoProperty = {
  id: number;
  rooms: TikoRoom[];
};

export type TikoRoom = {
  id: number;
  name: string;
  currentTemperatureDegrees: number;
};

export type TikoRoomResponse = {
  property: {
    room: TikoRoom;
  };
};
