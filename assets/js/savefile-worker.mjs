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
	}
});