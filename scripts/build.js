const builder = require('electron-builder');

async function build() {
  const result = await builder.build({
    targets: builder.Platform.WINDOWS.createTarget('portable'),
    config: {
      appId: 'com.rustyplayer.app',
      productName: 'RustyPlayer',
      directories: {
        output: 'dist'
      },
      win: {
        icon: 'assets/icon.ico'
      },
      files: [
        'src/**/*',
        'assets/**/*'
      ]
    }
  });
  
  console.log('Build complete:', result);
}

build().catch(console.error);