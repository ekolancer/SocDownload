import argparse

from app.vault import decrypt, encrypt, gen_key


def main() -> None:
    parser = argparse.ArgumentParser(prog="mediavault-keygen")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sp_gen = sub.add_parser("generate", help="generate a new Fernet key")
    sp_enc = sub.add_parser("encrypt", help="encrypt a value")
    sp_enc.add_argument("value")
    sp_dec = sub.add_parser("decrypt", help="decrypt a value")
    sp_dec.add_argument("token")

    args = parser.parse_args()

    if args.cmd == "generate":
        print(gen_key())
    elif args.cmd == "encrypt":
        print(encrypt(args.value))
    elif args.cmd == "decrypt":
        print(decrypt(args.token))


if __name__ == "__main__":
    main()
