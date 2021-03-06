const Fs = require("fs");
const Https = require("https");
const Path = require("path");
const Url = require("url");
const { CreateDir, RemoveDir } = require("trample/node");

const { COMPRESS_TEXT } = require("../i18n");
const { MAX_SIZE, OUTPUT_DIR } = require("../util/getting");
const { FilterImg, FormatExt, RandomHeader, ShowTitle } = require("../util/setting");

function CompressImg(path = "", obj = {}) {
	const opts = new Url.URL(obj.output.url);
	const req = Https.request(opts, res => {
		let file = "";
		res.setEncoding("binary");
		res.on("data", chunk => file += chunk);
		res.on("end", () => {
			const ddir = Path.join(OUTPUT_DIR.compress, path.replace(Path.basename(path), ""));
			const dpath = Path.join(OUTPUT_DIR.compress, FormatExt(path));
			!Fs.existsSync(ddir) && CreateDir(ddir);
			Fs.writeFileSync(dpath, file, "binary");
			console.log(COMPRESS_TEXT.compressCompleted(path, obj));
		});
	});
	req.on("error", e => console.log(COMPRESS_TEXT.compressFailed(path, e)));
	req.end();
}

function UploadImg(path = "") {
	if (Fs.statSync(path).size >= MAX_SIZE) {
		return console.log(COMPRESS_TEXT.uploadLimited(path));
	}
	const file = Fs.readFileSync(path, "binary");
	const opts = RandomHeader();
	const req = Https.request(opts, res => res.on("data", data => {
		const obj = JSON.parse(data.toString());
		obj.error
			? console.log(COMPRESS_TEXT.uploadFailed(path, obj.message))
			: CompressImg(path, obj);
	}));
	req.write(file, "binary");
	req.on("error", e => console.log(COMPRESS_TEXT.uploadFailed(path, e)));
	req.end();
}

module.exports = async function() {
	ShowTitle("compress");
	RemoveDir(OUTPUT_DIR.compress);
	CreateDir(OUTPUT_DIR.compress);
	FilterImg().forEach(v => UploadImg(v));
};