const SECTIONS = /** @type {const} */ ([
	"load-save-file",
	"save-file-loading",
	"save-loaded",
	"save-processing",
	"worker-error"
])

/**
 * hides all other sections but the section provided in section
 * @param {typeof SECTIONS[number]} chosen_section
 */
function toggle_section(chosen_section) {
	for (const section of SECTIONS) {
		if (chosen_section == section) {
			document.querySelector(`#${section}`).style.display = "block";
			continue;
		}

		document.querySelector(`#${section}`).style.display = "none";
	}
}

let SAVEFILE_WORKER = null;

/**
 * handles a generic message event from a web worker
 * @param {MessageEvent} e the event in question
 */
function handle_worker_message(e) {
	const { type, ...data } = e.data;

	switch (type) {
		case "file-loaded": {
			document.querySelector("#save-filename").textContent = data.name;

			if (data.version == 1) {
				document.querySelector("#btn-upgrade-save").style.display = "inline-block";
				document.querySelector("#btn-downgrade-save").style.display = "none";
			} else {
				document.querySelector("#btn-upgrade-save").style.display = "none";
				document.querySelector("#btn-downgrade-save").style.display = "inline-block";
			}

			toggle_section("save-loaded");
			break;
		}
		case "file-download": {
			const download_link = document.createElement("a");
			download_link.style.display = "none";

			download_link.href = data.url;
			download_link.download = data.filename;

			download_link.click();

			window.URL.revokeObjectURL(data.url);

			break;
		}
		case "file-version-changed": {
			if (data.version == 1) {
				document.querySelector("#btn-upgrade-save").style.display = "inline-block";
				document.querySelector("#btn-downgrade-save").style.display = "none";
			} else {
				document.querySelector("#btn-upgrade-save").style.display = "none";
				document.querySelector("#btn-downgrade-save").style.display = "inline-block";
			}

			toggle_section("save-loaded");
			break;
		}
		case "debug-print": {
			console.log(data);
			break;
		}
	}
}

function on_file_input(file) {
	toggle_section("save-file-loading");

	const worker = new Worker("assets/js/savefile-worker.mjs", { type: "module" });
	worker.addEventListener("message", handle_worker_message);
	worker.addEventListener("error", (e) => {
		toggle_section("worker-error");

		if (e.message) {
			document.querySelector("#error-location").textContent = `${e.filename}:${e.lineno}:${e.colno}`;
			document.querySelector("#error-text").textContent = e.message;
		} else {
			document.querySelector("#error-location").textContent = "unknown";
			document.querySelector("#error-text").textContent = "none provided";
		}

		console.error(e);
	});

	SAVEFILE_WORKER = worker;

	worker.postMessage({ type: "load-file", file });
}

const save_input_box = document.querySelector("#save-input-box");
save_input_box.addEventListener("dragenter", (event) => {
	event.stopPropagation();
	event.preventDefault();
}, false);
save_input_box.addEventListener("dragover", (event) => {
	event.stopPropagation();
	event.preventDefault();
}, false);
save_input_box.addEventListener("drop", (event) => {
	event.stopPropagation();
	event.preventDefault();

	const data_transfer = event.dataTransfer;
	const file = data_transfer.files[0];

	if (file) {
		on_file_input(file);
	}
}, false);

const save_input_element = document.querySelector("#save-file-input");
save_input_element.addEventListener("change", () => {
	const input_file = save_input_element.files[0];

	if (input_file) {
		on_file_input(input_file);
	}
}, false);

document.querySelectorAll("#restart-btn").forEach((b) => {
	b.addEventListener("click", (e) => {
		toggle_section("load-save-file");
		save_input_element.value = "";

		// stop worker if open
		if (SAVEFILE_WORKER) {
			SAVEFILE_WORKER.terminate();
			SAVEFILE_WORKER = null;
		}
	});
});

document.querySelector("#btn-download-plaintext").addEventListener("click", (e) => {
	SAVEFILE_WORKER.postMessage({ type: "download-plaintext" });
});

document.querySelector("#btn-upgrade-save").addEventListener("click", (e) => {
	toggle_section("save-processing");
	SAVEFILE_WORKER.postMessage({ type: "upgrade-save" });
});

document.querySelector("#btn-downgrade-save").addEventListener("click", (e) => {
	toggle_section("save-processing");
	SAVEFILE_WORKER.postMessage({ type: "downgrade-save" });
});