import Logo from "./Logo"
import Title from "./Title"

const Header = () => {
  return (
    <header className="flex flex-col items-center w-full">
      <Logo />
      <Title />
    </header>
  )
}

export default Header