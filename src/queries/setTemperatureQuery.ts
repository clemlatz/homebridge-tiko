import {gql} from '@apollo/client/core';

export const setTemperatureQuery = gql`
  mutation SET_PROPERTY_ROOM_ADJUST_TEMPERATURE(
  $propertyId: Int!
  $roomId: Int!
  $temperature: Float!
) {
  setRoomAdjustTemperature(
    input: {
      propertyId: $propertyId
      roomId: $roomId
      temperature: $temperature
    }
  ) {
    id
    adjustTemperature {
      active
      endDateTime
      temperature
      __typename
    }
    __typename
  }
}
`;
