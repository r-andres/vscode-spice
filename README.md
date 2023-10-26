# VSCode SPICE - Helpers for SPICE kernels


## Exploring a binary kernel

The extension makes easy the exploring of binary [SPICE](https://naif.jpl.nasa.gov/naif/) 
kernels using visual studio code

**Currently available and tested in MAC/Linux computers**

### Requirements

- [brief](https://naif.jpl.nasa.gov/naif/utilities.html) utility available in the computer
- [ckbrief](https://naif.jpl.nasa.gov/naif/utilities.html) utility available in the computer
- [commnt](https://naif.jpl.nasa.gov/naif/utilities.html) utility available in the computer
- [dskbrief](https://naif.jpl.nasa.gov/naif/utilities.html) utility available in the computer

### Configuring

Setup properly the SPICE utility path property ``Vscode-spice: Spice Utilities Path``

The value should be the path to the folder containing the SPICE utilities.

Get the utilities from: https://naif.jpl.nasa.gov/naif/utilities.html

## Versions

### 0.0.7
- Improved tool flow and aesthetics
### 0.0.6
- Diff the commnts
### 0.0.5
- CK support
- Deduce sclk/lsk in bundle
### 0.0.4
- Brief/Commnt
### 0.0.3
- Save comments
### 0.0.2
- Licensing
- SPICE configuration
### 0.0.1
- Initial Version
- Binary comment extraction