import struct, sys, json, re
MAGIC = 0x1F1903C103BC1FC6
FIELDS = ['fileLength','globalCodeIndex','functionCount','stringKindCount',
          'identifierCount','stringCount','overflowStringCount','stringStorageSize',
          'bigIntCount','bigIntStorageSize','regExpCount','regExpStorageSize',
          'arrayBufferSize','objKeyBufferSize','objValueBufferSize','segmentID',
          'cjsModuleCount','functionSourceCount','debugInfoOffset']
URL = re.compile(rb'^https?://[A-Za-z0-9._~:/?#\[\]@!$&\'()*+,;=%-]+$')
IDENT = re.compile(rb'^[A-Za-z_$][A-Za-z0-9_$]*$')

def load(path):
    b = open(path,'rb').read()
    assert struct.unpack_from('<Q', b, 0)[0] == MAGIC
    h = dict(zip(FIELDS, struct.unpack_from('<19I', b, 32)))
    h['version'] = struct.unpack_from('<I', b, 8)[0]
    sc, osc, sss = h['stringCount'], h['overflowStringCount'], h['stringStorageSize']

    # Locate the small string table by structural validity, then score alignments
    def valid(t):
        for i in range(sc):
            w = struct.unpack_from('<I', b, t+i*4)[0]
            off=(w>>1)&0x7FFFFF; ln=(w>>24)&0xFF
            if ln==0xFF:
                if off>=osc: return False
            elif off+ln>sss: return False
        return True
    cands=[]
    for t in range(128, min(len(b)-sc*4, 900000), 4):
        ok=True
        for i in (0,1,2,5,50,500,sc//2,sc-1):
            w = struct.unpack_from('<I', b, t+i*4)[0]
            off=(w>>1)&0x7FFFFF; ln=(w>>24)&0xFF
            if ln==0xFF:
                if off>=osc: ok=False; break
            elif off+ln>sss: ok=False; break
        if ok and valid(t): cands.append(t)
    best=None
    for t in cands:
        st = t + sc*4 + osc*8
        n=0
        for i in range(sc):
            w=struct.unpack_from('<I', b, t+i*4)[0]
            off=(w>>1)&0x7FFFFF; ln=(w>>24)&0xFF; u=w&1
            if ln==0xFF or u: continue
            s=b[st+off:st+off+ln]
            if URL.match(s): n+=100
            elif len(s)>3 and IDENT.match(s): n+=1
        if best is None or n>best[0]: best=(n,t,st)
    _, smallOff, stOff = best
    ovOff = smallOff + sc*4
    fhSize = (smallOff - 128 - h['stringKindCount']*4 - h['identifierCount']*4) / h['functionCount']
    h['_funcHeaderBytes'] = fhSize
    h['_stringTableOffset'] = smallOff

    strs=[]
    for i in range(sc):
        w = struct.unpack_from('<I', b, smallOff+i*4)[0]
        u16=w&1; off=(w>>1)&0x7FFFFF; ln=(w>>24)&0xFF
        if ln==0xFF: off, ln = struct.unpack_from('<II', b, ovOff+off*8)
        raw = b[stOff+off : stOff+off+(ln*2 if u16 else ln)]
        strs.append(raw.decode('utf-16-le','replace') if u16 else raw.decode('utf-8','replace'))
    return h, strs

if __name__=='__main__':
    h, strs = load(sys.argv[1])
    print(json.dumps({k:v for k,v in h.items()}, indent=2))
    with open(sys.argv[2],'w') as f:
        for s in strs: f.write(s.replace('\n','\\n').replace('\r','\\r')+'\n')
