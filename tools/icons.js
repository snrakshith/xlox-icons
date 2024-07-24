#!/usr/bin/env node
'use strict'

// Import necessary modules
import path from 'path'
import { fileURLToPath } from 'url'
import { IconSvgPaths16, IconSvgPaths20 } from '@blueprintjs/icons'
import camelCase from 'camelcase'
import fs from 'fs-extra'
import prettier from 'prettier'

// Get the __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Define paths
const iconsPath = path.resolve(__dirname, '../src/icons/generated')
const fileHeader = `// This is a generated file. DO NOT modify directly.\n\n`

// Main function
async function main() {
  const prettierConfig = await prettier.resolveConfig(__dirname)
  await fs.emptyDir(iconsPath)
  const rawIconNames = Object.keys(IconSvgPaths16)
  const iconNames = []

  // Create individual files for each icon as a React component
  const promises = rawIconNames.map(async name => {
    const iconName = camelCase(name, { pascalCase: true }) + 'Icon'
    const svgPaths16 = IconSvgPaths16[name]
    const svgPaths20 = IconSvgPaths20[name]
    iconNames.push(iconName)

    let iconFile = `${fileHeader}
import React, { memo, forwardRef } from 'react'
import Icon from '../src/Icon'

const svgPaths16 = [
  '${svgPaths16.join(`',\n  '`)}'
]
const svgPaths20 = [
  '${svgPaths20.join(`',\n  '`)}'
]

export const ${iconName} = memo(forwardRef(function ${iconName}(props, ref) {
  return <Icon svgPaths16={svgPaths16} svgPaths20={svgPaths20} ref={ref} name="${name}" {...props} />
}))
`

    const iconPath = path.join(iconsPath, `${iconName}.jsx`)

    // try {
    //   iconFile = prettier.format(iconFile, {
    //     ...prettierConfig,
    //     filepath: iconPath
    //   })
    // } catch (err) {
    //   console.error(`Error formatting file for ${iconName}:`, err)
    //   throw err
    // }

    await fs.writeFile(iconPath, iconFile)
  })

  await Promise.all(promises)
}

// Run the main function and handle errors
main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
