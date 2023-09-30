# VSCode SPICE - Helpers for SPICE kernels


## Easily reading of the comments of a binary kernel

The extension uses the Naif SPICE ``commnt`` utility.

### Requirements

- [commnt](https://naif.jpl.nasa.gov/naif/utilities.html) utility available in the computer

### Configuring

Setup properly the SPICE utility path property ``Vscode-spice: Spice Utilities Path``

The value should be the path to the folder containing the SPICE utilities.

Get commnt from: https://naif.jpl.nasa.gov/naif/utilities.html

## Versions

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