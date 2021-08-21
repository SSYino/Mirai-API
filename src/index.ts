import App from './providers/App';
import NativeException from './exception/NativeException';

NativeException.process();

App.loadENV();
App.loadExpress();
App.loadPrisma();
App.loadGoogleAPI();

export default App;