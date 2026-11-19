#include <cmath>
#include <algorithm>
#include <array>
#include <cstdio>
#include <cstdlib>
#include <vector>

// Same Genesis viewport and escape-time palette as viewer's roi/route.js.
constexpr double RE=-.743643887, IM=.131825904, SCALE=.031;
constexpr int palette[8][3]={{6,9,25},{14,36,68},{19,113,133},{73,224,214},{251,226,154},{223,120,51},{85,37,76},{6,12,45}};
std::array<double,3> sample(double x,double y) {
  double cr=RE+(x-.5)*SCALE,ci=IM+(y-.5)*SCALE,a=0,b=0;
  int k=0;
  for(;k<270;++k){
    double na=a*a-b*b+cr; b=2*a*b+ci; a=na;
    if(a*a+b*b>256)break;
  }
  if(k==270)return {5,10,29};
  double t=std::max(0.,k+2-std::log2(std::log(std::sqrt(a*a+b*b))));
  double p=std::fmod(std::log1p(t)*1.28,1.)*7.;
  int i=(int)p; double f=p-i;
  std::array<double,3> out{};
  for(int c=0;c<3;c++)out[c]=(1-f)*palette[i][c]+f*palette[i+1][c];
  return out;
}
int main(int argc,char**argv){
  int n=argc==2?std::atoi(argv[1]):1600;
  if(n<1||n>3000)return 2;
  std::vector<unsigned char> image((size_t)n*n*3);
  #pragma omp parallel for schedule(dynamic,8)
  for(int y=0;y<n;y++)for(int x=0;x<n;x++){
    std::array<double,3> v{};
    for(double dy:{.25,.75})for(double dx:{.25,.75}){
      auto a=sample((x+dx)/n,(y+dy)/n);
      for(int c=0;c<3;c++)v[c]+=a[c];
    }
    for(int c=0;c<3;c++)image[3*((size_t)y*n+x)+c]=(unsigned char)std::lround(v[c]/4.);
  }
  std::printf("P6\n%d %d\n255\n",n,n);
  return std::fwrite(image.data(),1,image.size(),stdout)==image.size()?0:1;
}
