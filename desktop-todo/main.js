const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');

let mainWindow;
let windowLevel = 'alwaysOnTop'; // 默认置顶

function createWindow() {
  // 检查图标文件是否存在
  const iconPath = '/Users/yinlusheng/Documents/MyProjects/to do工具/desktop-todo/assets/icon.icns';
  const fs = require('fs');
  console.log('图标文件路径:', iconPath);
  console.log('图标文件是否存在:', fs.existsSync(iconPath));

  mainWindow = new BrowserWindow({
    width: 380,
    height: 600,
    x: 100,
    y: 100,
    resizable: true,
    alwaysOnTop: true,
    frame: true,
    skipTaskbar: false,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      enableRemoteModule: true,
      nativeWindowOpen: true
    },
    titleBarStyle: 'default',
    transparent: false,
    backgroundColor: '#ffffff',
    minimizable: true,
    show: false
  });

  // 加载HTML文件
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // 延迟一点时间确保页面完全加载
    setTimeout(() => {
      mainWindow.webContents.executeJavaScript(`
        (function() {
          try {
            const { ipcRenderer } = require('electron');

            window.electronAPI = {
              minimizeWindow: () => {
                console.log('调用最小化');
                return ipcRenderer.invoke('minimize-window');
              },
              closeWindow: () => {
                console.log('调用关闭窗口');
                return ipcRenderer.invoke('close-window');
              },
              toggleOpacity: () => {
                console.log('调用切换透明度');
                return ipcRenderer.invoke('toggle-opacity');
              },
              setWindowLevel: (level) => {
                console.log('设置窗口层级:', level);
                return ipcRenderer.invoke('set-window-level', level);
              },
              getWindowLevel: () => {
                console.log('获取窗口层级');
                return ipcRenderer.invoke('get-window-level');
              }
            };

            console.log('Electron API已加载到渲染进程');
            console.log('electronAPI对象:', window.electronAPI);
            return 'API加载成功';
          } catch (error) {
            console.error('API加载失败:', error);
            return 'API加载失败: ' + error.message;
          }
        })();
      `).then(result => {
        console.log('executeJavaScript结果:', result);
      }).catch(error => {
        console.error('executeJavaScript失败:', error);
      });
    }, 1000);
  });

  // 窗口关闭处理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 开发时显示开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // 监听页面加载完成事件
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('页面加载完成');
  });
}

// IPC处理程序
ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('close-window', () => {
  app.quit();
});

ipcMain.handle('toggle-opacity', () => {
  if (mainWindow) {
    const currentOpacity = mainWindow.getOpacity();
    const newOpacity = currentOpacity === 1 ? 0.8 : 1;
    mainWindow.setOpacity(newOpacity);
    return newOpacity;
  }
});

ipcMain.handle('set-window-level', (event, level) => {
  if (mainWindow) {
    windowLevel = level;

    switch (level) {
      case 'alwaysOnTop':
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        break;
      case 'desktop':
        // macOS 特有的桌面层级，其他系统使用 normal
        if (process.platform === 'darwin') {
          mainWindow.setAlwaysOnTop(true, 'desktop');
        } else {
          mainWindow.setAlwaysOnTop(false);
        }
        break;
      case 'normal':
        mainWindow.setAlwaysOnTop(false);
        break;
      default:
        mainWindow.setAlwaysOnTop(true);
        break;
    }

    return level;
  }
});

ipcMain.handle('get-window-level', () => {
  return windowLevel;
});

// 全局快捷键
function setupGlobalShortcuts() {
  try {
    globalShortcut.register('CommandOrControl+Shift+T', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
    console.log('全局快捷键已注册');
  } catch (error) {
    console.log('注册全局快捷键失败:', error);
  }
}

app.whenReady().then(() => {
  console.log('Electron 应用准备就绪');
  createWindow();
  setupGlobalShortcuts();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// 处理证书错误
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('file://')) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

// 安全策略
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});

console.log('主进程启动完成');