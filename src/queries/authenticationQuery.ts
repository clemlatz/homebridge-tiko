import {gql} from '@apollo/client/core';

export const authenticationQuery = gql`
mutation LogIn(
  $email: String!
  $password: String!
  $langCode: String
  $retainSession: Boolean
) {
  logIn(
    input: {
      email: $email
      password: $password
      langCode: $langCode
      retainSession: $retainSession
    }
  ) {
    user {
      id
      properties {
        id
      }
    }
    token
  }
}
`;
