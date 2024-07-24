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
const iconsIndexPath = path.resolve(__dirname, '../src/icons/index.js')
const indexPath = path.resolve(__dirname, '../src/index.ts')
const typedefPath = path.resolve(__dirname, '../index.d.ts')
const iconNamesMapperPath = path.resolve(__dirname, '../src/icons/generated/IconNameMapper.js')
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

    let iconFile = `
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
    const iconPath = path.join(iconsPath, `${iconName}.js`)

    // Debugging before formatting
    console.log(`Prettier config: ${JSON.stringify(prettierConfig, null, 2)}`)
    console.log(`Raw iconFile before formatting: ${iconFile}`)

    // try {
    //   iconFile = prettier.format(iconFile, {
    //     ...prettierConfig,
    //     filepath: iconPath
    //   })
    // } catch (err) {
    //   console.error(`Error formatting file for ${iconName}:`, err)
    //   throw err
    // }

    // Debugging information to verify the type of iconFile
    console.log(`Formatted iconFile: ${iconFile}`)
    if (typeof iconFile !== 'string') {
      console.error(`Expected iconFile to be a string but received ${typeof iconFile}`)
      console.error(iconFile)
      throw new TypeError(`Expected iconFile to be a string but received ${typeof iconFile}`)
    }

    await fs.writeFileSync(iconPath, iconFile)
  })

  await Promise.all(promises)

  // Create the IconNameMapper file
  const iconNamesMap = rawIconNames.reduce((agg, name) => {
    agg[name] = camelCase(name, { pascalCase: true }) + 'Icon'
    return agg
  }, {})

  let iconNamesMapperFile = `
${fileHeader}
export const IconNameMapper = ${JSON.stringify(iconNamesMap, null, 2)}
`

  // iconNamesMapperFile = prettier.format(iconNamesMapperFile, {
  //   ...prettierConfig,
  //   filepath: iconNamesMapperPath
  // })

  await fs.writeFile(iconNamesMapperPath, iconNamesMapperFile)

  // Create the icons/index.js file which exports individual icons
  let iconsIndexFile = iconNames
    .map(iconName => {
      return `export { ${iconName} } from './generated/${iconName}'`
    })
    .join('\n')

  // iconsIndexFile = prettier.format(`${fileHeader}${iconsIndexFile}`, {
  //   ...prettierConfig,
  //   filepath: iconsIndexPath
  // })

  await fs.writeFile(iconsIndexPath, iconsIndexFile)

  // Update the main index.js file to include individual icon exports
  const iconsExport = `/* Start generated icons */
export * from './icons'
/* End generated icons */
`

  let indexContent = await fs.readFile(indexPath, 'utf8')
  indexContent = indexContent.replace(
    /\/\* Start generated icons \*\/[\s\S]*?\/\* End generated icons \*\//i,
    iconsExport
  )

  // indexContent = prettier.format(indexContent, {
  //   ...prettierConfig,
  //   filepath: indexPath
  // })

  await fs.writeFile(indexPath, indexContent)

  // Update the typedefs to include icons
  const iconTypeDefs = iconNames.map(componentName => `export declare const ${componentName}: IconComponent`).join('\n')

  const iconsTypeDefs = `/* Start generated icons */
export type IconComponent = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<IconProps> & React.RefAttributes<SVGElement>
>
${iconTypeDefs}
/* End generated icons */`

  let typedefs = await fs.readFile(typedefPath, 'utf8')
  typedefs = typedefs.replace(/\/\* Start generated icons \*\/[\s\S]*?\/\* End generated icons \*\//i, iconsTypeDefs)

  await fs.writeFile(typedefPath, typedefs)
}

// Run the main function and handle errors
main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
