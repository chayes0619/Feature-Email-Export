import { type ImmutableObject } from 'seamless-immutable'

export interface Config {
  exampleConfigProperty: string
  emailHtmlTemplate: string
  emailSubject: string
  recipientField: string
}

export type IMConfig = ImmutableObject<Config>
