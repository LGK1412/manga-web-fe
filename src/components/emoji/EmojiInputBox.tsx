"use client"

import { useEffect, useRef, useState } from "react"
import Picker from "@emoji-mart/react"
import data from "@emoji-mart/data"
import { Smile } from "lucide-react"
import { useTheme } from "next-themes"
import axios from "axios"

interface EmojiInputBoxProps {
    onChange?: (html: string) => void
    clear?: boolean
}

export default function EmojiInputBox({ onChange, clear }: EmojiInputBoxProps) {
    const inputRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const pickerRef = useRef<HTMLDivElement>(null)
    const selectionRef = useRef<Range | null>(null)
    const [showPicker, setShowPicker] = useState(false)
    const { theme } = useTheme()
    const [packs, setPacks] = useState<any[]>([]);

    // helper: node is inside parent?
    const isNodeInside = (parent: Node | null, node: Node | null) => {
        if (!parent || !node) return false
        return parent.contains(node)
    }

    // 👉 Hàm lưu selection (vị trí con trỏ) — chỉ lưu nếu selection nằm trong inputRef
    const saveSelection = () => {
        const sel = window.getSelection()
        if (!sel || sel.rangeCount === 0) return

        const range = sel.getRangeAt(0)
        // ensure the selection is inside inputRef
        const startInside = isNodeInside(inputRef.current, range.startContainer)
        const endInside = isNodeInside(inputRef.current, range.endContainer)
        if (startInside && endInside) {
            // clone range to avoid it being mutated / invalidated
            selectionRef.current = range.cloneRange()
        }
    }

    // đặt con trỏ về cuối input (fallback)
    const focusInputEnd = () => {
        const el = inputRef.current
        if (!el) return
        el.focus()
        const range = document.createRange()
        range.selectNodeContents(el)
        range.collapse(false)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
        // save that new range
        selectionRef.current = range.cloneRange()
    }

    // 👉 Khôi phục selection trước khi chèn emoji
    const restoreSelection = () => {
        const sel = window.getSelection()
        sel?.removeAllRanges()

        if (selectionRef.current) {
            try {
                // If the saved range's container is no longer in the input (detached), check
                const startOk = isNodeInside(inputRef.current, selectionRef.current.startContainer)
                const endOk = isNodeInside(inputRef.current, selectionRef.current.endContainer)
                if (!startOk || !endOk) {
                    // fallback: đặt caret ở cuối input
                    focusInputEnd()
                    return
                }
                sel?.addRange(selectionRef.current)
                return
            } catch (e) {
                // any error -> fallback
                focusInputEnd()
                return
            }
        }

        // nếu không có selection lưu trước đó -> đặt về cuối
        focusInputEnd()
    }
    // Xoá text trong input
    useEffect(() => {
        if (clear && inputRef.current) {
            inputRef.current.innerHTML = "";
        }
    }, [clear]);

    const insertAtCursor = (html: string) => {
        // restore selection (nếu có) trước khi chèn
        restoreSelection()

        const sel = window.getSelection()
        if (!sel || !sel.rangeCount) return
        const range = sel.getRangeAt(0)
        range.deleteContents()

        const temp = document.createElement("span")
        temp.innerHTML = html
        const frag = document.createDocumentFragment()
        let node: ChildNode | null
        while ((node = temp.firstChild)) frag.appendChild(node)
        range.insertNode(frag)

        range.collapse(false)
        sel.removeAllRanges()
        sel.addRange(range)

        // update saved selection to the new caret location
        selectionRef.current = range.cloneRange()
    }

    const customFromApi = packs.map(pack => ({
        id: pack._id,
        name: pack.name,
        emojis: pack.emojis.map((e: any) => ({
            id: e._id,
            name: e.name,
            keywords: [],
            skins: e.skins.map((s: { src: string }) => ({
                src: `${process.env.NEXT_PUBLIC_API_URL}${s.src}`
            }))
        })),
        price: pack.price
    }));


    useEffect(() => {
        const fetchAllPacks = async () => {
            try {
                // Chạy song song 2 API
                const [freeRes, ownRes] = await Promise.all([
                    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/emoji-pack/free-emoji-pack`),
                    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/user/emoji-packs-own`, {
                        withCredentials: true,
                    }),
                ]);

                const freePacks = Array.isArray(freeRes.data) ? freeRes.data : [];
                const ownPacks = Array.isArray(ownRes.data) ? ownRes.data : [];

                console.log("Free ", freePacks);
                console.log("Own ", ownPacks);

                // Gộp lại, loại pack trùng ID
                const mergedPacks = [
                    ...ownPacks, // ưu tiên pack user sở hữu lên trước
                    ...freePacks.filter(
                        free => !ownPacks.some(own => own._id === free._id)
                    ),
                ];

                setPacks(mergedPacks);
            } catch (err) {
                console.error("Lỗi fetch emoji pack:", err);
            }
        };

        fetchAllPacks();
    }, []);



    // 👉 Click ngoài tắt picker
    useEffect(() => {
        if (!showPicker) return
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node
            if (
                pickerRef.current &&
                !pickerRef.current.contains(target) &&
                buttonRef.current &&
                !buttonRef.current.contains(target) &&
                inputRef.current &&
                !inputRef.current.contains(target)
            ) {
                setShowPicker(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [showPicker])

    return (
        <div className="relative w-full  z-[999999]">
            {/* Box nhập nội dung */}
            <div
                ref={inputRef}
                contentEditable
                suppressContentEditableWarning
                className="w-full border border-slate-300 rounded-xl p-5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                onInput={() => {
                    if (onChange && inputRef.current) {
                        onChange(inputRef.current.innerHTML)
                    }
                    saveSelection()
                }}
                onKeyUp={saveSelection}
                onMouseUp={saveSelection}
                onFocus={saveSelection}
                style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    maxHeight: "300px",
                    overflowY: "auto",
                }}
            />

            {/* Nút mở emoji picker */}
            <button
                ref={buttonRef}
                type="button"
                onClick={(e) => {
                    e.preventDefault() // tránh mất selection do click
                    // lưu selection hiện tại (nếu có)
                    saveSelection()
                    setShowPicker((s) => !s)
                }}
                onMouseDown={(e) => e.preventDefault()}
                className="absolute bottom-2 right-0 hover:bg-gray-200 hover:text-gray-950 p-2 rounded-full shadow z-[999999]"
            >
                <Smile className="w-5 h-5" />
            </button>

            {/* Emoji picker */}
            {showPicker && (
                <div
                    ref={pickerRef}
                    className="fixed z-[999999]"
                    style={{
                        top: "65%",
                        left: "87.5%",
                        transform: "translate(-50%, -50%)",
                    }}
                >
                    <div className="shadow-xl rounded-xl">
                        <Picker
                            data={data}
                            custom={customFromApi}
                            theme={theme === "dark" ? "dark" : "light"}
                            previewPosition="none"
                            navPosition="bottom"
                            perLine={12}
                            emojiSize={20}
                            emojiButtonSize={28}
                            onEmojiSelect={(emoji: any) => {
                                const value = emoji.native || emoji.src || emoji.skins?.[0]?.src
                                if (!value) return

                                if (value.startsWith("http")) {
                                    insertAtCursor(
                                        `<span><img src="${value}" class="inline w-10 h-10 align-middle"/></span>`
                                    )
                                } else {
                                    insertAtCursor(value)
                                }

                                if (onChange && inputRef.current) {
                                    onChange(inputRef.current.innerHTML)
                                }
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}




{/* <div className="border p-2 rounded">
        <strong>Nội dung hiện tại:</strong>
        <div className="mt-1 break-all">{message || "(trống)"}</div>
        <EmojiInputBox
          onChange={(html) => {
            setMessage(html)
            console.log("📨 Data từ EmojiInputBox:", html)
          }}
        />
        <div>Cái 2</div>
        <EmojiInputBox
          onChange={(html) => {
            setMessage(html)
            console.log("📨 Data từ EmojiInputBox:", html)
          }}
        />
      </div> */}