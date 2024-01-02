import {gql} from '@apollo/client/core';

export const setRoomModeQuery = gql`
mutation SET_ROOM_MODE($propertyId: Int!, $roomId: Int!, $mode: String!) {
    setRoomMode(input: {propertyId: $propertyId, roomId: $roomId, mode: $mode}) {
        id
        mode {
            boost
            absence
            frost
            disableHeating
            __typename
        }
        __typename
    }
}
`;
