import re

with open(r'D:\Koffi Cobbin\Volume A\Black Box\NextJS\Ghost Town\MuseWave\client\src\pages\downloads.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix corrupted JSX expressions
fixes = {
    "data-testid={card-download-}": 'data-testid={"card-download-" + track.id}',
    "data-testid={button-download-play-}": 'data-testid={"button-download-play-" + track.id}',
    "data-testid={button-download-play-next-}": 'data-testid={"button-download-play-next-" + track.id}',
    "data-testid={button-download-remove-}": 'data-testid={"button-download-remove-" + track.id}',
    'alt={track.title + cover}': 'alt={track.title + " cover"}',
}

for old, new in fixes.items():
    if old in content:
        content = content.replace(old, new)
        print(f'Fixed: {old[:50]}')

with open(r'D:\Koffi Cobbin\Volume A\Black Box\NextJS\Ghost Town\MuseWave\client\src\pages\downloads.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
