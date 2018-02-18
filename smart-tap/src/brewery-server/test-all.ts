import * as path from 'path';
import * as fs from 'fs';
import * as Sodium from 'sodium-native';

import { HEX, BASE64, UTF8 } from '../common/utils';

import { BreweryKeyStore } from './brewery-key-store';
import { SessionStore } from './session-store';

import { UserInfo, User, UserStore } from './user-store';
import { UserSecurityServices } from '../user-agent/user-security-services';

import { TavernStore, TavernInfo } from './tavern-store';
import { TavernSecurityServices } from '../tavern-agent/tavern-security-services';

import { BreweryServices } from './brewery-services';

let initUsers = require( path.resolve( 'user-base.json' ) );

let brewery = new BreweryServices( initUsers )

if ( 0 ) {

  if ( brewery.checkUsers() ) {

    fs.writeFileSync( path.resolve( 'user-base.json' ),
      JSON.stringify( brewery.userStore.toJSON(), null, 2 ), UTF8 );
  }
}

let testUser = 'guzzler';

let sessionStore = brewery.sessionStore;

let sessionID = sessionStore.createSession( testUser ).id;
let session = sessionStore.lookupSession( sessionID );

let uss = new UserSecurityServices( testUser );

/**
 * Test login strategyA (sealedBox)
**/
let sealedBox = uss.buildLoginA( session.challenge, '227489' );

let ok = session.authenticateSessionA( sealedBox );
if ( !ok )
  console.log( "Not Authenticated B" )


/**
 * Test login strategyB (signedBox)
**/
let signedBox = uss.buildLoginB( session.challenge, session.user.salt, '227489' );

ok = session.authenticateSessionB( signedBox );
if ( !ok )
  console.log( "Not Authenticated B" )


/**
 * Test user secureDatagram communication (to/from server)
**/
let nonce = uss.buildNonce();

let msg1 = { message: "hello" };

let userDatagram = uss.wrapSecureDatagram( msg1, nonce );

let in1 = session.upwrapSecureDatagram( userDatagram, nonce );

console.log( "Server Received: " + JSON.stringify( in1 ) );

nonce = uss.buildNonce();

let msg2 = { message: "Aangenaam kennis te maken" };

let svrDatagram = session.wrapSecureDatagram( msg2, nonce );

let in2 = uss.upwrapSecureDatagram( svrDatagram, nonce );

console.log( "User Received: " + JSON.stringify( in2 ) );

/**
 * Test tavern stream communication
**/
let tavernStore = brewery.tavernStore;
let tavInfo1: TavernInfo = {
  id: "tavern-1",
  name: "TAVERN-1",

  streamPublicKey: Buffer.from( "bzukyliboDycoXu0XyQ03WkTPFTc3BWNrLqkuQAhkS8=", BASE64 ),

  comments: "7e3afa5bc7de22b7a69ade0f006d3795933b60727d3fa1bde6063d4f74c3d8f9" // SEED
}

tavernStore.addTavern( tavInfo1 );

let tav1 = tavernStore.getTavern( "tavern-1" );

let tss = new TavernSecurityServices( tav1.id );

// init Tavern-side stream
let initChunk = tss.initBreweryStreams();

// send initial Chunk to server .. init Server-side streams
let brewChunk = tav1.initTavernStreams( initChunk );

// and process server-response Chunk
tss.processServerChunk( brewChunk );

let m1Chunk = tss.buildServerChunk( Buffer.from( JSON.stringify( { message: "secret message" }), UTF8 ) );
console.log( "Chunk: " + m1Chunk.toString( HEX ) );
console.log( "     : " + m1Chunk.toString( UTF8 ) );
let m1Plain = tav1.processClientChunk( m1Chunk );
console.log( "Plain: " + m1Plain.toString( UTF8 ) );

let m2Chunk = tav1.buildClientChunk( Buffer.from( JSON.stringify( { message: "secret reply" }), UTF8 ) );
console.log( "Chunk: " + m2Chunk.toString( HEX ) );
console.log( "     : " + m2Chunk.toString( UTF8 ) );
let m2Plain = tss.processServerChunk( m2Chunk );
console.log( "Plain: " + m2Plain.toString( UTF8 ) );






/*

var buffer = sodium.sodium_malloc(size)
sodium.sodium_memzero(buffer)
sodium.sodium_mlock(buffer)
sodium.sodium_mprotect_noaccess(buffer)
sodium.sodium_mprotect_readwrite(buffer)
sodium.sodium_mprotect_readonly(buffer)


crypto_auth(output, input, key);
var bool = crypto_auth_verify(output, input, key);

sodium.crypto_secretbox_easy(cipher, message, nonce, key)

console.log('Encrypted message:', cipher)

var plainText = new Buffer(cipher.length - sodium.crypto_secretbox_MACBYTES)

if (!sodium.crypto_secretbox_open_easy(plainText, cipher, nonce, key))

Sodium.crypto_aead*/