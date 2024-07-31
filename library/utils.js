import * as constants from  './constants'
import { pipe } from 'it-pipe'
import * as lp from 'it-length-prefixed'
import map from 'it-map'

const prefix = constants.CONSTANTS_PREFIX

export const mkErr = msg => new Error(`${prefix}: ${msg}`)

export function uint8ArrayToString(uint8Array){
	const string = new TextDecoder().decode(uint8Array)
	return string
}

export function uint8ArrayFromString(string){
	const uint8Array = new TextEncoder().encode(string)
	return uint8Array
}

export { pipe }

export { lp }

export { map }

export function mkDebug(msg){
	if(constants.CONSTANTS_DEBUG_ENABLED)console.debug(msg)
	return
}
