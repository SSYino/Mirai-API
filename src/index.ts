import App from './providers/App';
import NativeException from './exception/NativeException';

NativeException.process();

App.loadENV();
App.loadExpress();
App.loadPrisma();
// TODO: Implement GoogleAPIs
//App.loadGoogleAPI();

export default App;