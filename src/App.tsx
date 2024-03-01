import './App.css'
import { BrowserRouter } from 'react-router-dom'
import LoginButton from './LoginButton'
// import useRoute from './useRoute'

function App() {
  return (
    <BrowserRouter>
      <MainWindow />
    </BrowserRouter>
  )
}

function MainWindow() {
  // const { route } = useRoute()
  return (
    <div>
      <h3>Log in using GitHub in order to use Neurosift Annotations</h3>
      <LoginButton />
    </div>
  )
}

export default App
