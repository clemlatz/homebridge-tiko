import {gql} from '@apollo/client/core';

export const getPropertyQuery = gql`
query GET_PROPERTY_OVERVIEW_DECENTRALISED($id: Int!, $excludeRooms: [Int]) {
  property(id: $id) {
    id
    rooms(excludeRooms: $excludeRooms) {
      id
      name
    }
  }
}
`;
