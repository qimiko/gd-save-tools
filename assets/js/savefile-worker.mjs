import * as Savefile from "./savefile.mjs";

let FILEDATA = null;
let FILENAME = null;

addEventListener("message", (e) => {
	const { type, ...data } = e.data;

	switch (type) {
		case "load-file": {
			const reader = new FileReaderSync();
			const buffer = reader.readAsArrayBuffer(data.file);

			FILEDATA = Savefile.try_load_save(new Uint8Array(buffer));
			FILENAME = data.file.name;

			postMessage({
				type: "file-loaded",
				name: FILENAME,
				compressed_size: data.file.size,
				size: FILEDATA.file.length,
				version: FILEDATA.plist_version
			});

			break;
		}
		case "download-plaintext": {
			const blob = new Blob([FILEDATA.file], {type: "application/xml"});
			const url = URL.createObjectURL(blob);

			postMessage({
				type: "file-download",
				filename: `${FILENAME}`,
				url,
			});

			break;
		}
		case "upgrade-save": {
			const upgraded_data = Savefile.upgrade_save_file(FILEDATA.file, FILEDATA.plist_version);
			FILEDATA.file = upgraded_data;
			FILEDATA.plist_version = 2.0;

			postMessage({
				type: "file-version-changed",
				version: FILEDATA.plist_version,
			});
			break;
		}
		case "downgrade-save": {
			const upgraded_data = Savefile.downgrade_save_file(FILEDATA.file, FILEDATA.plist_version);
			FILEDATA.file = upgraded_data;
			FILEDATA.plist_version = 1.0;

			postMessage({
				type: "file-version-changed",
				version: FILEDATA.plist_version,
			});
			break;
		}
	}
});