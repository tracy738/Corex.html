/**
 * Optional: run with `npm run seed` to populate a few sample scripts
 * so the site isn't empty on first run.
 */
const db = require('../server/db');

const samples = [
  {
    title: 'Welcome Notification GUI',
    game_name: 'Any Game',
    description: 'A simple example script that shows a styled on-screen notification when it loads.',
    author: 'Owner',
    tags: ['gui', 'example', 'beginner'],
    featured: true,
    code: `local player = game.Players.LocalPlayer
local gui = Instance.new("ScreenGui")
gui.Name = "WelcomeNotice"
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")

local frame = Instance.new("Frame")
frame.Size = UDim2.new(0, 260, 0, 60)
frame.Position = UDim2.new(0.5, -130, 0, 20)
frame.BackgroundColor3 = Color3.fromRGB(20, 22, 30)
frame.BorderSizePixel = 0
frame.Parent = gui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 12)
corner.Parent = frame

local label = Instance.new("TextLabel")
label.Size = UDim2.new(1, -20, 1, 0)
label.Position = UDim2.new(0, 10, 0, 0)
label.BackgroundTransparency = 1
label.Text = "COREX SCRIPT example loaded!"
label.TextColor3 = Color3.fromRGB(240, 240, 245)
label.Font = Enum.Font.GothamMedium
label.TextSize = 16
label.Parent = frame`,
  },
  {
    title: 'FPS + Ping Counter',
    game_name: 'Any Game',
    description: 'Lightweight on-screen display for frame rate and network ping, useful as a debug overlay.',
    author: 'Owner',
    tags: ['utility', 'debug', 'stats'],
    featured: false,
    code: `local stats = game:GetService("Stats")
local player = game.Players.LocalPlayer

local gui = Instance.new("ScreenGui")
gui.Name = "StatsOverlay"
gui.Parent = player:WaitForChild("PlayerGui")

local label = Instance.new("TextLabel")
label.Size = UDim2.new(0, 160, 0, 40)
label.Position = UDim2.new(0, 10, 0, 10)
label.BackgroundTransparency = 0.4
label.BackgroundColor3 = Color3.fromRGB(10, 10, 15)
label.TextColor3 = Color3.fromRGB(120, 200, 255)
label.Font = Enum.Font.Code
label.TextSize = 14
label.Parent = gui

game:GetService("RunService").Heartbeat:Connect(function()
    local fps = math.floor(1 / game:GetService("RunService").RenderStepped:Wait())
    local ping = stats.Network.ServerStatsItem["Data Ping"]:GetValueString()
    label.Text = string.format("FPS: %d\\nPing: %s", fps, ping)
end)`,
  },
  {
    title: 'Click Teleport Tool',
    game_name: 'Sandbox Games',
    description: 'Gives the player a tool that teleports their character to wherever they click in the world.',
    author: 'Owner',
    tags: ['tool', 'movement', 'fun'],
    featured: true,
    code: `local player = game.Players.LocalPlayer
local mouse = player:GetMouse()

local tool = Instance.new("Tool")
tool.Name = "Click Teleport"
tool.RequiresHandle = false
tool.Parent = player:WaitForChild("Backpack")

tool.Activated:Connect(function()
    local target = mouse.Hit
    local character = player.Character
    if character and target then
        character:SetPrimaryPartCFrame(target + Vector3.new(0, 3, 0))
    end
end)`,
  },
];

for (const s of samples) {
  db.createScript(s);
}

console.log(`Seeded ${samples.length} sample scripts.`);
