/**
 * The two things the panel does with files, neither of which a pane control offers: it hands
 * one to the browser to save, and it asks the browser for one to read. Both are plain DOM.
 */

/** Hands the browser `text` as a file named `filename` to save. */
export const downloadText = (
  filename: string,
  text: string,
  mimeType: string,
): void => {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));

  downloadUrl(filename, url);
  URL.revokeObjectURL(url);
};

/** Hands the browser `url`, a data URL or an object URL, as a file named `filename` to save. */
export const downloadUrl = (filename: string, url: string): void => {
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
};

/**
 * Opens the browser's picker for files of `accept` and calls `onText` with the text of the one
 * a person chooses. Reading a file is the one thing in the panel that finishes later; the
 * callback runs when it has, and a file that cannot be read is reported through `onFailure`.
 * The input is made for the one pick and never shown.
 */
export const pickTextFile = (
  accept: string,
  onText: (text: string) => void,
  onFailure: (message: string) => void,
): void => {
  const input = document.createElement("input");

  input.type = "file";
  input.accept = accept;
  input.addEventListener("change", (): void => {
    const file = input.files === null ? null : input.files.item(0);

    if (file === null) {
      return;
    }

    file.text().then(onText, (): void => {
      onFailure(`The file "${file.name}" could not be read`);
    });
  });
  input.click();
};
