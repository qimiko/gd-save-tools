import forge from "https://cdn.jsdelivr.net/npm/node-forge@1.3.1/+esm";
import pako from "https://cdn.jsdelivr.net/npm/pako@2.1.0/+esm";
import { XMLParser } from "https://cdn.jsdelivr.net/npm/fast-xml-parser@4.1.3/+esm";

/**
 * performs an xor on every value in an iterator
 * @template T
 * @param {Iterable.<T>} data data
 * @param {T} key value that can be xored with each key in the iterator
 * @returns {Iterable.<T>} data with xor applied
 */
function xor(data, key) {
	return data.map((byte) => byte ^ key);
}

/**
 * attempts to decode a save file in windows format
 * @param {Uint8Array} data encoded savedata
 * @returns {string} save data as string, may need to be checked for validity
 */
function load_save_as_windows(data) {
	// windows save file is decoded with xor -> base64 -> zlib
	const decoded = xor(data, 11);

	// convert to string for base64 decode
	// deal with urlsafe decoding as well
	const str_decoded = decoded.reduce((s, x) => s + String.fromCharCode(x), "")
		.replace(/_/g, '/').replace(/-/g, '+');

	const translated = forge.util.binary.base64.decode(str_decoded);
	const decompressed = pako.inflate(translated, { windowBits: 31 });

	const str_decompressed = decompressed.reduce((s, x) => s + String.fromCharCode(x), "");

	return str_decompressed;
}

/**
 * attempts to decode a save file in macos format
 * @param {Uint8Array} data encoded savedata
 * @returns {string} save data as string, may need to be checked for validity
 */
function load_save_as_macos(data) {
	// macos save file is decoded with aes
	const mac_savekey = [
		0x69, 0x70, 0x75, 0x39, 0x54, 0x55, 0x76, 0x35,
		0x34, 0x79, 0x76, 0x5D, 0x69, 0x73, 0x46, 0x4D,
		0x68, 0x35, 0x40, 0x3B, 0x74, 0x2E, 0x35, 0x77,
		0x33, 0x34, 0x45, 0x32, 0x52, 0x79, 0x40, 0x7B
	];

	const cipher = forge.cipher.createDecipher('AES-ECB', mac_savekey);
	cipher.start();
	cipher.update(forge.util.createBuffer(data));

	return cipher.output.toString();
}

/**
 * @typedef {Object} Gamesave
 * @property {?string} file
 * @property {boolean} is_mac
 * @property {number} plist_version
 */

/**
 * attempts to decode a save file in both formats
 * @param {Uint8Array} data encoded savedata
 * @returns {Gamesave}
 */
export function try_load_save(data) {
	// savedata is encoded in one of two ways
	// mac: aes-ecb encrypted
	// windows: zlib -> base64
	// first is to determe what type of savedata is being looked at
	// the easiest way is trying to decode as windows first

	const save = { file: null, is_mac: false };

	// test if valid plist first
	try {
		const as_string = data.reduce((s, x) => s + String.fromCharCode(x), "")
		if (as_string.startsWith("<?xml")) {
			save.file = as_string;
		}
	} catch (_) {
		// ignore error, continue parsing
	}

	if (!save.file) {
		try {
			// attempt windows decode
			save.file = load_save_as_windows(data);
		} catch (_) {
			// try load as macos
			save.file = load_save_as_macos(data);
			save.is_mac = true;
		}
	}

	// validate save data/read attributes
	const parser = new XMLParser({
		ignoreAttributes: false,
		// there probably shouldn't be any conflict with a proper plist file
		attributeNamePrefix : "attr_"
	});

	const parsed_save = parser.parse(save.file);


	if (!("plist" in parsed_save)) {
		throw new TypeError("non plist object given");
	}

	if ("attr_gjver" in parsed_save.plist) {
		save.plist_version = +parsed_save.plist.attr_gjver
	} else {
		save.plist_version = 1
	}


	return save;
}
