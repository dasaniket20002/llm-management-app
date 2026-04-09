import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import Logo from './logo'
import { Button } from './ui/button'
import { ButtonGroup } from './ui/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  EllipsisVertical,
  GamepadDirectional,
  Lightbulb,
  LightbulbOff,
  SunMoon,
  Zap,
} from 'lucide-react'
import {
  THEMES,
  TOAST_POSITIONS,
  useAppContext,
} from '#/lib/client/contexts/app/app-context'

const HeaderSettingsMenu = () => {
  const { theme, setTheme, toastPosition, setToastPosition } = useAppContext()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="icon-sm" variant="ghost" aria-label="More Settings">
            <EllipsisVertical />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Settings</DropdownMenuLabel>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <SunMoon />
              Theme
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Select Theme</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={theme}
                    onValueChange={setTheme}
                  >
                    {THEMES.map((t, i) => (
                      <DropdownMenuRadioItem
                        key={i}
                        value={t}
                        className="capitalize"
                      >
                        {t === 'light' && <Lightbulb />}
                        {t === 'dark' && <LightbulbOff />}
                        {t === 'system' && <Zap />}

                        {t}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <GamepadDirectional />
              Toast Position
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Select Position</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={toastPosition}
                    onValueChange={(v) => {
                      setToastPosition(v)
                      toast.success(
                        `Toast Position set to ${v.replaceAll('-', ' ')}`,
                      )
                    }}
                  >
                    {TOAST_POSITIONS.map((t, i) => (
                      <DropdownMenuRadioItem
                        key={i}
                        value={t}
                        className="capitalize"
                      >
                        {t === 'top-left' && <ArrowUpLeft />}
                        {t === 'top-right' && <ArrowUpRight />}
                        {t === 'bottom-left' && <ArrowDownLeft />}
                        {t === 'bottom-right' && <ArrowDownRight />}
                        {t === 'top-center' && <ArrowUp />}
                        {t === 'bottom-center' && <ArrowDown />}

                        {t.replaceAll('-', ' ')}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const Header = () => {
  return (
    <nav className="h-12 px-6 sticky top-0 flex items-center justify-between border-b bg-background/90 backdrop-blur-md">
      <Logo includeName />

      <div className="flex gap-3 items-center">
        <HeaderSettingsMenu />
        <ButtonGroup aria-label="User Actions">
          <Button
            size="sm"
            variant="outline"
            aria-label="sign-up"
            nativeButton={false}
            render={<Link to="/sign-up">Sign Up</Link>}
          />
          <Button
            size="sm"
            variant="default"
            aria-label="sign-in"
            nativeButton={false}
            render={<Link to="/sign-in">Sign In</Link>}
          />
        </ButtonGroup>
      </div>
    </nav>
  )
}

export default Header
