import struct, sys, json
MAGIC = 0x1F1903C103BC1FC6
FIELDS = ['fileLength','globalCodeIndex','functionCount','stringKindCount',
          'identifierCount','stringCount','overflowStringCount','stringStorageSize',
          'bigIntCount','bigIntStorageSize','regExpCount','regExpStorageSize',
          'arrayBufferSize','objKeyBufferSize','objValueBufferSize','segmentID',
          'cjsModuleCount','functionSourceCount','debugInfoOffset']

def parse(path):
    b = open(path,'rb').read()
    assert struct.unpack_from('<Q', b, 0)[0] == MAGIC
    ver = struct.unpack_from('<I', b, 8)[0]
    h = dict(zip(FIELDS, struct.unpack_from('<19I', b, 32)))
    h['version'] = ver; h['actualFileSize'] = len(b)

    o = 128
    fnOff = o
    # v98 uses a 12-byte SmallFuncHeader (verified: section size == functionCount*12)
    o += h['functionCount'] * 12; o = (o+3)&~3
    o += h['stringKindCount'] * 4; o = (o+3)&~3
    o += h['identifierCount'] * 4; o = (o+3)&~3
    smallOff = o
    o += h['stringCount'] * 4; o = (o+3)&~3
    ovOff = o
    o += h['overflowStringCount'] * 8; o = (o+3)&~3
    stOff = o

    strs = []
    for i in range(h['stringCount']):
        w = struct.unpack_from('<I', b, smallOff + i*4)[0]
        u16 = w & 1; off = (w>>1)&0x7FFFFF; ln = (w>>24)&0xFF
        if ln == 0xFF:
            off, ln = struct.unpack_from('<II', b, ovOff + off*8)
        raw = b[stOff+off : stOff+off+(ln*2 if u16 else ln)]
        strs.append(raw.decode('utf-16-le','replace') if u16 else raw.decode('utf-8','replace'))

    fns = []
    for i in range(h['functionCount']):
        w0,w1,w2 = struct.unpack_from('<III', b, fnOff + i*12)
        fns.append({'i':i, 'off': w0 & 0x1FFFFFF, 'params': (w0>>25)&0x7F,
                    'size': w1 & 0x7FFF, 'nameId': (w1>>15)&0x1FFFF,
                    'infoOffset': w2 & 0x1FFFFFF, 'frameSize': (w2>>25)&0x7F})
    for f in fns:
        f['name'] = strs[f['nameId']] if f['nameId'] < len(strs) else '<?>'
    h['_offsets'] = {'funcHeaders':fnOff,'stringTable':smallOff,'overflow':ovOff,'storage':stOff}
    return h, strs, fns

if __name__ == '__main__':
    h, strs, fns = parse(sys.argv[1]); out = sys.argv[2]
    print(json.dumps(h, indent=2))
    with open(out+'.strings.txt','w') as f:
        for i,s in enumerate(strs): f.write('%d\t%s\n' % (i, s.replace('\n','\\n').replace('\r','\\r')))
    with open(out+'.functions.txt','w') as f:
        for x in fns: f.write('%d\t%s\tparams=%d\tbcsize=%d\n' % (x['i'], x['name'], x['params'], x['size']))
