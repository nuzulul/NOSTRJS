import * as constants from  './constants.js'
import {createStore} from 'tinybase'
import {createIndexedDbPersister} from 'tinybase/persisters/persister-indexed-db'
import * as Y from 'yjs'
import {createYjsPersister} from 'tinybase/persisters/persister-yjs'

class nostrjsDB{
	
	store
	persister
	
	constructor(store,persister){
		this.store = store
		this.persister = persister
	}
	
	hasEvent(id){
		return this.store.hasRow(constants.CONSTANTS_STORE_TABLE_EVENTS, id)
	}
	
	addEvent(event){
		const dataEvent = this.#serializeEvent(event)
		this.store.setRow(constants.CONSTANTS_STORE_TABLE_EVENTS, event.id, dataEvent)
	}

	#serializeEvent(event){
		const content = event.content
		const created_at = event.created_at
		const id = event.id
		const kind = event.kind
		const pubkey = event.pubkey
		const sig = event.sig
		const tags = JSON.stringify(event.tags)
		const dataEvent = {content,created_at,id,kind,pubkey,sig,tags}
		return dataEvent
	}
	
	#deserializeEvent(dataEvent){
		const content = dataEvent.content
		const created_at = dataEvent.created_at
		const id = dataEvent.id
		const kind = dataEvent.kind
		const pubkey = dataEvent.pubkey
		const sig = dataEvent.sig
		const tags = JSON.parse(dataEvent.tags)
		const event = {content,created_at,id,kind,pubkey,sig,tags}
		return event

	}
	
	async getStoreState(){
		
		const storetemp = createStore()
		
		const ids = this.store.getSortedRowIds(constants.CONSTANTS_STORE_TABLE_EVENTS, 'created_at', true, 1, constants.CONSTANTS_STORE_SYNC_LIMIT)
		for(const id of ids){
			const dataEvent = this.store.getRow(constants.CONSTANTS_STORE_TABLE_EVENTS, id)
			storetemp.setRow(constants.CONSTANTS_STORE_TABLE_EVENTS, dataEvent.id, dataEvent)
		}
		
		const doc = new Y.Doc()
		const persister = createYjsPersister(storetemp, doc)
		await persister.save()
		//console.log('doc',doc.toJSON())
		const state = await Y.encodeStateAsUpdate(doc)
		return state
	}
	
	async setStoreState(state){
		const doc = new Y.Doc()
		const persister = createYjsPersister(this.store, doc)
		await persister.startAutoLoad()
		await persister.startAutoSave()			
		await Y.applyUpdate(doc, state)
		//console.log('outputdial',doc.toJSON())
	}
	
	static async createDB(){
		const dbname = constants.CONSTANTS_PREFIX+'-events'
		const store = createStore()
		const persister = createIndexedDbPersister(store, dbname)
		await persister.load()
		await persister.startAutoSave()
		return new nostrjsDB(store,persister)
	}
	
}

export {nostrjsDB}