import Handlebars from "handlebars";
import pdf from "html-pdf";
// import fs from "fs";
// import path from "path";

// ----------------------------------------------------------------------

export interface ICreateOptions {
  format?: "A3" | "A4" | "A5" | "Legal" | "Letter" | "Tabloid" | undefined;
  orientation?: "portrait" | "landscape" | undefined;
  border?:
    | string
    | {
        top?: string | undefined;
        right?: string | undefined;
        bottom?: string | undefined;
        left?: string | undefined;
      }
    | undefined;
  header?:
    | {
        height?: string | undefined;
        contents?: string | undefined;
      }
    | undefined;
  footer?:
    | {
        height?: string | undefined;
        contents?:
          | {
              first?: string | undefined;
              [page: number]: string;
              default?: string | undefined;
              last?: string | undefined;
            }
          | undefined;
      }
    | undefined;
}

export interface ICreateDocument {
  html: string;
  data: any;
  path: string;
  type?: "buffer" | "stream" | undefined;
}

export class Pdf {
  handlebars: typeof Handlebars;
  pdf: typeof pdf;

  constructor() {
    this.handlebars = Handlebars;
    this.pdf = pdf;
  }

  generate(document: ICreateDocument, options: ICreateOptions) {
    return new Promise((resolve, reject) => {
      if (!document || !document.html || !document.data) {
        reject(new Error("malformed options"));
      }

      const html = this.handlebars.compile(document.html)(document.data);
      // try {
      //   const indexHtmlPath = path.join(__dirname, "..", "/files/index.html");
      //   fs.writeFileSync(indexHtmlPath, html);
      // } catch (error) {
      //   console.log("error >>> ", error);
      // }

      // console.log("path ", path.resolve(__dirname));
      const pdfPromise = this.pdf.create(html, options);

      switch (document.type) {
        case "buffer":
          pdfPromise.toBuffer((err, res) => {
            if (!err) resolve(res);
            else reject(err);
          });
          break;

        case "stream":
          pdfPromise.toStream((err, res) => {
            if (!err) resolve(res);
            else reject(err);
          });
          break;

        default:
          pdfPromise.toFile(document.path, (err, res) => {
            if (!err) resolve(res);
            else reject(err);
          });
          break;
      }
    });
  }
}
