import {gql} from 'graphql-request';

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
    settings {
      client {
        name
        __typename
      }
      support {
        serviceActive
        phone
        email
        __typename
      }
      __typename
    }
    user {
      id
      clientCustomerId
      agreements
      properties {
        id
        allInstalled
        __typename
      }
      inbox(modes: ["app"]) {
        actions {
          label
          type
          value
          __typename
        }
        id
        lockUser
        maxNumberOfSkip
        messageBody
        messageHeader
        __typename
      }
      __typename
    }
    token
    firstLogin
    __typename
  }
}
`;
