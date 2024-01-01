import {gql} from '@apollo/client/core';
export const getRoomQuery = gql`
query GET_PROPERTY_MODE_AND_ROOM($propertyId: Int!, $roomId: Int!) {
  property(id: $propertyId) {
    id
    room(id: $roomId) {
      id
      name
      currentTemperatureDegrees
      targetTemperatureDegrees
      mode {
        boost
        absence
        frost
        disableHeating
      }
    }
  }
}
`;
