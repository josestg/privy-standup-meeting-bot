module.exports = {
    dictionary: {
        process: {
            success: {
                getMessage: (name, tasklist) => `Halo *${name}*, Berikut Task yang akan anda Tawarkan.\n${tasklist}`,
                getOptions: (keyboard) => {
                    return {
                        "parse_mode": "Markdown",
                        "reply_markup": {
                            "inline_keyboard": keyboard
                        }
                    }
                }
            }
        },
        select: {
            success: {
                getMessage: name => `Halo ${name}, Berikut adalah task Anda yang masih *In Progress*. Pilih task yang yang akan di *Tawarkan*.`,
                getOptions: keyboard => {
                    return {
                        "parse_mode": "Markdown",
                        "reply_markup": {
                            "inline_keyboard": keyboard
                        }
                    }
                }
            }
        },
        offer: {
            sender: {
                getMessage: () => `Menunggu Konfirmasi Dari Teman Anda`,
                getOptions: () => {
                    return {
                        "parse_mode": "Markdown"
                    }
                }
            },
            receiver: {
                getMessage: (name, tasklist) => `Teman Anda *${name}* Menawarkan task berikut ke Anda. Apakah Anda setuju?\n${tasklist}`,
                getOptions: (prefix) => {
                    return {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: "Yes", callback_data: `${prefix}-respondYes` },
                                    { text: "No", callback_data: `${prefix}-respondNo` }
                                ]
                            ]
                        }
                    }
                }
            },
        },
        respondYes: {
            receiver: {
                getMessage: tasklist => `*Terimakasih!* Task berhasil ditambahkan ke progress Anda.\n${tasklist}`,
                getOptions: (prefix, id) => {
                    return {
                        "parse_mode": "Markdown",
                    }
                }
            },
            sender: {
                getMessage: tasklist => `*Selamat!*, Permintaan Anda diterima. Berikut Task anda yang berhasil di *Offer*:\n${tasklist}`,
                getOptions: (prefix, id) => {
                    return {
                        "parse_mode": "Markdown",
                    }
                }
            }
        },
        respondNo: {
            receiver: {
                getMessage: () => `*Terimakasih!* Task tidak ditambahkan ke progress Anda.`,
                getOptions: (prefix, id) => {
                    return {
                        "parse_mode": "Markdown",
                    }
                }
            },
            sender: {
                getMessage: () => `*Mohon Maaf!*, Permintaan Anda ditolak.`,
                getOptions: (prefix, id) => {
                    return {
                        "parse_mode": "Markdown",
                    }
                }
            }
        }
    }
}