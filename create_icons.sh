#!/bin/bash
mkdir -p core.iconset
sips -s format png -z 16 16     public/coreLogo.png --out core.iconset/icon_16x16.png
sips -s format png -z 32 32     public/coreLogo.png --out core.iconset/icon_16x16@2x.png
sips -s format png -z 32 32     public/coreLogo.png --out core.iconset/icon_32x32.png
sips -s format png -z 64 64     public/coreLogo.png --out core.iconset/icon_32x32@2x.png
sips -s format png -z 128 128   public/coreLogo.png --out core.iconset/icon_128x128.png
sips -s format png -z 256 256   public/coreLogo.png --out core.iconset/icon_128x128@2x.png
sips -s format png -z 256 256   public/coreLogo.png --out core.iconset/icon_256x256.png
sips -s format png -z 512 512   public/coreLogo.png --out core.iconset/icon_256x256@2x.png
sips -s format png -z 512 512   public/coreLogo.png --out core.iconset/icon_512x512.png
sips -s format png -z 1024 1024 public/coreLogo.png --out core.iconset/icon_512x512@2x.png

iconutil -c icns core.iconset
mv core.icns public/icon.icns
rm -rf core.iconset
