import * as constants from  './constants'

const prefix = constants.CONSTANTS_PREFIX

export const mkErr = msg => new Error(`${prefix}: ${msg}`)
