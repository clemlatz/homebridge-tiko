export type TikoLoginResponse = {
  data : {
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
};

export type TikoPropertyResponse = {
  data: {
    property: TikoProperty;
  };
};

export type TikoProperty = {
  id: number;
  rooms: TikoRoom[];
};

export type TikoRoom = {
  id: number;
  name: string;
  targetTemperatureDegrees: number;
  currentTemperatureDegrees: number;
  mode: {
    boost: boolean;
    absence: boolean;
    frost: boolean;
    disableHeating: boolean;
  };
  status: {
    heatingOperating: boolean;
  };
};

export type TikoRoomResponse = {
  data: {
    property: {
      room: TikoRoom;
    };
  };
};

export type TikoMode = 'boost' | 'absence' | 'frost' | 'disableHeating' | null;
