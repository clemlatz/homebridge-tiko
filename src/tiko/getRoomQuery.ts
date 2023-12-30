import { gql } from 'graphql-request';

export const getRoomQuery = gql`
query GET_PROPERTY_MODE_AND_ROOM($propertyId: Int!, $roomId: Int!) {
  property(id: $propertyId) {
    id
    mode
    room(id: $roomId) {
      id
      name
      type
      color
      heaters
      currentTemperatureDegrees
      targetTemperatureDegrees
      humidity
      sensors
      mode {
        boost
        absence
        frost
        disableHeating
        __typename
      }
      ...ExtendedStatus
      __typename
    }
    __typename
  }
}

fragment ExtendedStatus on RoomType {
  status {
    disconnected
    heaterDisconnected
    heatingOperating
    sensorBatteryLow
    sensorDisconnected
    temporaryAdjustment
    heatersRegulated
    heaterCalibrationState
    __typename
  }
  __typename
}
`;
