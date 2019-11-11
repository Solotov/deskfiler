import React from 'react';
import ReactDOM from 'react-dom';

import archiver from 'archiver';
import AdmZip from 'adm-zip';

import PluginSettings from './containers/PluginSettings';

archiver.registerFormat('zip-encryptable', require('archiver-zip-encryptable'));

const checkIfSingleArchive = ({ filePaths, path }) => ((filePaths.length === 1 && path.parse(filePaths[0]).ext === '.zip') || false);

const getFilePaths = async ({
  path,
  filePaths,
  isSingleArchive,
  createNewFile,
  readFilePath,
}) => {
  const parsedPath = path.parse(filePaths[0]);
  if (isSingleArchive && !createNewFile) {
    return { filePath: filePaths[0], dirPath: parsedPath.dir };
  }
  const paths = await readFilePath({
    title: 'Select save directory',
    defaultFileName: filePaths.length > 1 ? 'group.zip' : `${parsedPath.name}.zip`,
    filters: [{
      name: 'Archive',
      extensions: ['zip'],
    }],
  });
  return paths;
};

const getPluginUi = isSingleArchive => (
  [{
    elementType: 'input',
    name: 'password',
    type: 'password',
    label: 'Enter Password:',
    placeholder: `${isSingleArchive ? '(required)' : '(optional)'}`,
    isRequired: isSingleArchive,
    value: '',
  },
  ...(isSingleArchive ? [{
    elementType: 'checkbox',
    name: 'createNewFile',
    label: 'Create new file',
    value: false,
  }] : [])]
);

const archive = ({ filePaths, password, fs, path, filePath }) => new Promise((resolve, reject) => {
  const output = fs.createWriteStream(filePath);

  const compressed = archiver(password ? 'zip-encryptable' : 'zip', {
    zlib: { level: 9 },
    forceLocalTime: true,
    password,
  });

  compressed.pipe(output);
  filePaths.forEach((fp) => {
    const fileBuffer = fs.readFileSync(fp);
    const { name, ext } = path.parse(fp);
    compressed.append(fileBuffer, { name: `${name}${ext}` });
  });

  compressed.finalize();

  resolve();
});

const protect = ({
  inputPath,
  outputPath,
  password,
  fs,
  createNewFile,
  notify,
}) => new Promise((resolve, reject) => {
  if (password) {
    try {
      const zip = new AdmZip(inputPath);
      const zipEntries = zip.getEntries();

      if (!createNewFile) {
        fs.unlinkSync(inputPath);
      }

      const output = fs.createWriteStream(outputPath);

      const compressed = archiver(password ? 'zip-encryptable' : 'zip', {
        zlib: { level: 9 },
        forceLocalTime: true,
        password,
      });

      compressed.pipe(output);

      zipEntries.forEach((zipEntry) => {
        const fileBuffer = zip.readFile(zipEntry);
        compressed.append(fileBuffer, { name: zipEntry.name });
      });

      compressed.finalize();

      resolve();
    } catch (err) {
      notify('Cannot unzip file. It is corrupted or password protected.');
      reject(err);
    }
  }
  resolve();
});

window.PLUGIN = {
  handleFiles: async ({
    inputs,
    system,
    context,
  }) => {
    const { filePaths } = inputs;
    const { fs, path } = system;
    const {
      log,
      exit,
      notify,
      settings,
      readFilePath,
      readUserInput,
      startProgress,
      finishProgress,
      resetProgress,
      openOutputFolder,
    } = context;

    try {
      if (filePaths) {
        const pluginSettings = await settings.get();
        const isSingleArchive = checkIfSingleArchive({ filePaths, path });
        const ui = getPluginUi(isSingleArchive).map(el => (pluginSettings[el.name] ? { ...el, value: pluginSettings[el.name] } : el));

        const { password, createNewFile } = await readUserInput({ title: 'Options', ui });
        const { filePath, dirPath } = await getFilePaths({ path, readFilePath, isSingleArchive, createNewFile, filePaths });
        startProgress();
        if (isSingleArchive) {
          await protect({
            inputPath: filePaths[0],
            outputPath: filePath,
            password,
            createNewFile,
            notify,
            fs,
          });
        } else {
          await archive({
            filePaths,
            password,
            fs,
            path,
            filePath,
          });
          log({
            action: isSingleArchive ? 'Added password protection to zip archive' : `Compressed files ${password ? 'and added password ' : ''}to zip archive`,
            meta: {
              type: 'text',
              value: `Path: ${filePath}, Password: ${password || 'none'}`,
            },
          });
        }
        finishProgress();
        await openOutputFolder(dirPath);
        notify(isSingleArchive ? 'Archive password protected.' : `Files compressed${password ? ' and password protected' : ''}.`);
      }
    } catch (err) {
      resetProgress();
      if (err) {
        console.error(err);
      }
    } finally {
      resetProgress();
      exit();
    }
  },
  handleOpen: async ({ system, context }) => {
    const { fs, path } = system;
    const {
      log,
      exit,
      notify,
      settings,
      readFilePath,
      showPluginWindow,
      hidePluginWindow,
      startProgress,
      finishProgress,
      resetProgress,
      openOutputFolder,
    } = context;
    try {
      const pluginSettings = await settings.get();
      const root = document.getElementById('root');
      const App = () => (
        <PluginSettings /* eslint-disable-line react/jsx-filename-extension */
          settings={pluginSettings}
          path={path}
          checkIfSingleArchive={checkIfSingleArchive}
          getPluginUi={getPluginUi}
          startProcessing={async ({ filePaths, password, createNewFile, isSingleArchive }) => {
            hidePluginWindow();
            try {
              const { filePath, dirPath } = await getFilePaths({ path, readFilePath, isSingleArchive, createNewFile, filePaths });
              startProgress();
              if (isSingleArchive) {
                await protect({
                  inputPath: filePaths[0],
                  outputPath: filePath,
                  password,
                  createNewFile,
                  notify,
                  fs,
                });
              } else {
                await archive({
                  filePaths,
                  password,
                  fs,
                  path,
                  filePath,
                });
                log({
                  action: isSingleArchive ? 'Added password protection to zip archive' : `Compressed files ${password ? 'and added password ' : ''}to zip archive`,
                  meta: {
                    type: 'text',
                    value: `Path: ${filePath}, Password: ${password || 'none'}`,
                  },
                });
              }
              finishProgress();
              await openOutputFolder(dirPath);
              notify(isSingleArchive ? 'Archive password protected.' : `Files compressed${password ? ' and password protected' : ''}.`);
            } catch (err) {
              resetProgress();
              if (err) {
                console.error(err);
              }
            } finally {
              exit();
            }
          }}
          cancel={() => {
            exit();
          }}
        />
      );
      ReactDOM.render(<App />, root);
      await showPluginWindow();
    } catch (err) {
      resetProgress();
      if (err) {
        console.error(err);
        exit();
      }
    }
  },
};