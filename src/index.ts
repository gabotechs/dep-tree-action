import * as core from "@actions/core"
import * as tc from "@actions/tool-cache"
import os from "os"
import path from "path"
import { exec } from "child_process"

const packageJson = require('../package.json')

const downloadURL = "https://github.com/gabotechs/dep-tree/releases/download"

function getAssetURL () {
    let ext = "tar.gz"
    let platform = os.platform().toString()
    switch (platform) {
        case "win32":
            platform = "windows"
            ext = "zip"
            break
    }
    let arch = os.arch()
    switch (arch) {
        case "x64":
            arch = "x86_64"
            break
        case "x32":
        case "ia32":
            arch = "386"
            break
    }
    platform = platform.charAt(0).toUpperCase() + platform.slice(1)

    return `${downloadURL}/v${packageJson.version}/dep-tree_${packageJson.version}_${platform}_${arch}.${ext}`
}

async function install() {
    core.info(`Installing dep-tree ${packageJson.version}...`)
    const startedAt = Date.now()
    const assetURL = getAssetURL()
    core.info(`Downloading ${assetURL} ...`)
    const archivePath = await tc.downloadTool(assetURL)
    let extractedDir
    let repl = /\.tar\.gz$/
    if (assetURL.endsWith("zip")) {
        extractedDir = await tc.extractZip(archivePath, process.env.HOME)
        repl = /\.zip$/
    } else {
        const args = ["xz"]
        if (process.platform.toString() !== "darwin") {
            args.push("--overwrite")
        }
        extractedDir = await tc.extractTar(archivePath, process.env.HOME, args)
    }

    const depTreePath = path.join(extractedDir, `dep-tree`)
    core.info(`Installed dep-tree into ${depTreePath} in ${Date.now() - startedAt}ms`)
    return depTreePath
}

function asyncExec(cmd: string): any {
    return new Promise(res => exec(cmd, (error, stdout, stderr) => {
        res({ stdout, stderr, error })
    }))
}

async function run() {
    const path = await install()
    let configPath = core.getInput('config')
    if (configPath === "") configPath = ".dep-tree.yml"
    const {
        stdout,
        stderr,
        error
    } = await asyncExec(`${path} check --config ${configPath}`)
    if (stdout != null) core.info(stdout)
    if (stderr != null) core.info(stderr)
    if (error != null) {
        throw new Error()
    }
    core.info(`All the rules are satisfied`)
}

run()
    .catch(err => {
        core.setFailed(err)
        process.exit(1)
    })
