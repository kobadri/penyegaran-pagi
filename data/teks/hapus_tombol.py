import glob
from bs4 import BeautifulSoup

# Mengambil semua file .html di direktori saat ini (data/teks/)
html_files = glob.glob("*.html")

count = 0
for filepath in html_files:
    with open(filepath, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f.read(), "html.parser")
    
    removed = False
    # Mencari elemen yang berisi teks "Audio" atau "Video" untuk dihapus
    for tag in soup.find_all(["a", "button", "div", "span"]):
        text = tag.get_text(strip=True)
        if text in ["Audio", "Video"]:
            tag.decompose()
            removed = True

    if removed:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(str(soup))
        print(f"Berhasil membersihkan: {filepath}")
        count += 1

print(f"Selesai! Total {count} file berhasil diperbarui.")
